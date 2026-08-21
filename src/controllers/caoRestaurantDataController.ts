import { Response } from 'express';
import { getCaoPool, sql } from '../config/caoSql';
import { AuthenticatedRequest } from '../middlewares/auth';

const KEYWORDS = [
  'pos',
  'menu',
  'table',
  'restaurant',
  'order',
  'kitchen',
  'item',
  'stock',
  'warehouse',
  'recipe',
  'food',
  'bill',
  'cash',
  'payment',
  'supplier',
  'guest',
  'outlet',
  'consumption',
  'material',
  'unit',
  'ingredient',
  'inventory',
];

type CaoColumn = {
  schemaName: string;
  tableName: string;
  columnName: string;
  dataType: string;
  maxLength: number | null;
  ordinal: number;
};

type CaoTable = {
  schemaName: string;
  tableName: string;
  totalRows: number | null;
  createdAt: Date;
  modifiedAt: Date;
};

const buildKeywordWhere = () => KEYWORDS.map((keyword) => `LOWER(t.name) LIKE '%${keyword}%'`).join(' OR ');

const groupTable = (tableName: string) => {
  const name = tableName.toLowerCase();
  if (/(compos|^pos|restaurant|outlet|table)/.test(name)) return 'POS / bàn / outlet';
  if (/(menu|food|item|hanghoa|nhomhang)/.test(name)) return 'Menu / món ăn';
  if (/(order|bill|payment|cash|paid|captain)/.test(name)) return 'Order / bill / thanh toán';
  if (/(kitchen|stock|warehouse|recipe|consumption|material|unit|ingredient|inventory)/.test(name)) return 'Kho bếp / định lượng';
  if (/(supplier)/.test(name)) return 'Nhà cung cấp';
  if (/(guest|folio)/.test(name)) return 'Khách / lưu trú';
  return 'Khác';
};

const escapeName = (value: string) => `[${value.replace(/]/g, ']]')}]`;
const isSensitiveColumn = (columnName: string) => /(password|secret|token|private|apikey|api_key|key|hash)/i.test(columnName);

const fetchCatalogRows = async () => {
  const pool = await getCaoPool();
  const where = buildKeywordWhere();

  const tablesResult = await pool.request().query<CaoTable>(`
    WITH MatchingTables AS (
      SELECT TOP 220 s.name AS schemaName, t.name AS tableName, t.object_id AS objectId, t.create_date AS createdAt, t.modify_date AS modifiedAt
      FROM sys.tables t
      JOIN sys.schemas s ON t.schema_id = s.schema_id
      WHERE ${where}
      ORDER BY t.name ASC
    )
    SELECT
      mt.schemaName,
      mt.tableName,
      CONVERT(bigint, COALESCE(SUM(CASE WHEN ps.index_id IN (0, 1) THEN ps.row_count ELSE 0 END), 0)) AS totalRows,
      mt.createdAt,
      mt.modifiedAt
    FROM MatchingTables mt
    LEFT JOIN sys.dm_db_partition_stats ps ON mt.objectId = ps.object_id
    GROUP BY mt.schemaName, mt.tableName, mt.createdAt, mt.modifiedAt
    ORDER BY mt.tableName ASC
  `);

  const names = tablesResult.recordset.map((item) => item.tableName.replace(/'/g, "''"));
  const columnsResult = names.length
    ? await pool.request().query<CaoColumn>(`
        SELECT
          TABLE_SCHEMA AS schemaName,
          TABLE_NAME AS tableName,
          COLUMN_NAME AS columnName,
          DATA_TYPE AS dataType,
          CHARACTER_MAXIMUM_LENGTH AS maxLength,
          ORDINAL_POSITION AS ordinal
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME IN (${names.map((name) => `'${name}'`).join(',')})
        ORDER BY TABLE_NAME, ORDINAL_POSITION
      `)
    : { recordset: [] as CaoColumn[] };

  const columnMap = new Map<string, CaoColumn[]>();
  for (const column of columnsResult.recordset) {
    const key = `${column.schemaName}.${column.tableName}`;
    columnMap.set(key, [...(columnMap.get(key) || []), column]);
  }

  return tablesResult.recordset.map((table) => ({
    ...table,
    totalRows: table.totalRows === null || table.totalRows === undefined ? null : Number(table.totalRows),
    group: groupTable(table.tableName),
    columns: columnMap.get(`${table.schemaName}.${table.tableName}`) || [],
  }));
};

export const getCaoRestaurantCatalog = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const tables = await fetchCatalogRows();
    const groups = tables.reduce<Record<string, any[]>>((acc, table) => {
      acc[table.group] = acc[table.group] || [];
      acc[table.group].push(table);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        database: 'CAO_BNHHotelManagement',
        source: 'CaoConnection',
        keywords: KEYWORDS,
        tableCount: tables.length,
        groups,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không đọc được catalog dữ liệu CAO.' });
  }
};

export const previewCaoRestaurantTable = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schemaName = String(req.query.schema || 'dbo');
    const tableName = String(req.params.tableName || '');
    const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 100);
    const catalog = await fetchCatalogRows();
    const table = catalog.find(
      (item) => item.schemaName.toLowerCase() === schemaName.toLowerCase() && item.tableName.toLowerCase() === tableName.toLowerCase(),
    );

    if (!table) {
      res.status(404).json({ success: false, message: 'Bảng không nằm trong danh sách dữ liệu nhà hàng được phép xem.' });
      return;
    }

    const pool = await getCaoPool();
    const result = await pool.request()
      .input('Limit', sql.Int, limit)
      .query(`SELECT TOP (@Limit) * FROM ${escapeName(table.schemaName)}.${escapeName(table.tableName)}`);

    const rows = result.recordset.map((row) => Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, isSensitiveColumn(key) ? '***' : value]),
    ));

    res.json({
      success: true,
      data: {
        table,
        limit,
        rows,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không preview được bảng CAO.' });
  }
};
