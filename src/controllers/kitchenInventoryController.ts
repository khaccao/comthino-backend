import { Response } from 'express';
import crypto from 'crypto';
import { getCaoPool, sql } from '../config/caoSql';
import { AuthenticatedRequest } from '../middlewares/auth';

type Money = number | string | { toString(): string } | null | undefined;

const newId = () => crypto.randomUUID();
const toNumber = (value: Money) => Number(value || 0);
const toBool = (value: unknown) => value === true || value === 'true' || value === 1 || value === '1';
const row = <T>(recordset: T[]) => recordset[0] || null;
const todayKey = () => new Date().toISOString().slice(0, 10);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isDeadlock = (error: any) => error?.number === 1205 || /deadlock/i.test(error?.message || '');

let schemaReadyAt = 0;
let schemaPromise: Promise<void> | null = null;

const withSqlRetry = async <T>(operation: () => Promise<T>, attempts = 3): Promise<T> => {
  let lastError: any;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (!isDeadlock(error) || attempt === attempts) break;
      await sleep(160 * attempt);
    }
  }
  throw lastError;
};

export const ensureKitchenInventorySchema = async () => {
  if (schemaReadyAt && Date.now() - schemaReadyAt < 5 * 60 * 1000) return;
  if (schemaPromise) return schemaPromise;

  schemaPromise = withSqlRetry(async () => {
    const pool = await getCaoPool();
    await pool.request().batch(`
IF OBJECT_ID(N'dbo.ComKitchenUnits', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ComKitchenUnits (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    Code NVARCHAR(40) NOT NULL,
    Name NVARCHAR(80) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    SortOrder INT NOT NULL CONSTRAINT DF_ComKitchenUnits_SortOrder DEFAULT 0,
    IsActive BIT NOT NULL CONSTRAINT DF_ComKitchenUnits_IsActive DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ComKitchenUnits_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NULL
  );
  CREATE UNIQUE INDEX UX_ComKitchenUnits_Code ON dbo.ComKitchenUnits(Code);
END;

IF OBJECT_ID(N'dbo.ComKitchenIngredients', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ComKitchenIngredients (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    Code NVARCHAR(60) NOT NULL,
    Name NVARCHAR(180) NOT NULL,
    Category NVARCHAR(80) NULL,
    UnitId NVARCHAR(64) NULL,
    UnitName NVARCHAR(80) NOT NULL,
    CurrentStock DECIMAL(18,3) NOT NULL CONSTRAINT DF_ComKitchenIngredients_CurrentStock DEFAULT 0,
    MinStock DECIMAL(18,3) NOT NULL CONSTRAINT DF_ComKitchenIngredients_MinStock DEFAULT 0,
    LastCost DECIMAL(18,2) NOT NULL CONSTRAINT DF_ComKitchenIngredients_LastCost DEFAULT 0,
    IsActive BIT NOT NULL CONSTRAINT DF_ComKitchenIngredients_IsActive DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ComKitchenIngredients_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NULL
  );
  CREATE UNIQUE INDEX UX_ComKitchenIngredients_Code ON dbo.ComKitchenIngredients(Code);
  CREATE INDEX IX_ComKitchenIngredients_Category ON dbo.ComKitchenIngredients(Category);
END;

IF OBJECT_ID(N'dbo.ComKitchenStockEntries', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ComKitchenStockEntries (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    Code NVARCHAR(60) NOT NULL,
    EntryDate DATE NOT NULL,
    SupplierName NVARCHAR(180) NULL,
    Note NVARCHAR(MAX) NULL,
    TotalAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_ComKitchenStockEntries_TotalAmount DEFAULT 0,
    CreatedBy NVARCHAR(160) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ComKitchenStockEntries_CreatedAt DEFAULT SYSDATETIME()
  );
  CREATE UNIQUE INDEX UX_ComKitchenStockEntries_Code ON dbo.ComKitchenStockEntries(Code);
  CREATE INDEX IX_ComKitchenStockEntries_EntryDate ON dbo.ComKitchenStockEntries(EntryDate);
END;

IF OBJECT_ID(N'dbo.ComKitchenStockEntryLines', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ComKitchenStockEntryLines (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    EntryId NVARCHAR(64) NOT NULL,
    IngredientId NVARCHAR(64) NOT NULL,
    IngredientName NVARCHAR(180) NOT NULL,
    UnitId NVARCHAR(64) NULL,
    UnitName NVARCHAR(80) NOT NULL,
    Quantity DECIMAL(18,3) NOT NULL,
    UnitCost DECIMAL(18,2) NOT NULL CONSTRAINT DF_ComKitchenStockEntryLines_UnitCost DEFAULT 0,
    Amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_ComKitchenStockEntryLines_Amount DEFAULT 0,
    Note NVARCHAR(MAX) NULL
  );
  CREATE INDEX IX_ComKitchenStockEntryLines_EntryId ON dbo.ComKitchenStockEntryLines(EntryId);
END;

IF OBJECT_ID(N'dbo.ComKitchenRecipes', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ComKitchenRecipes (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    MenuItemId NVARCHAR(64) NOT NULL,
    MenuItemCode NVARCHAR(80) NULL,
    MenuItemName NVARCHAR(220) NOT NULL,
    IngredientId NVARCHAR(64) NOT NULL,
    IngredientName NVARCHAR(180) NOT NULL,
    UnitId NVARCHAR(64) NULL,
    UnitName NVARCHAR(80) NOT NULL,
    QuantityPerItem DECIMAL(18,3) NOT NULL,
    WastePercent DECIMAL(10,2) NOT NULL CONSTRAINT DF_ComKitchenRecipes_WastePercent DEFAULT 0,
    Note NVARCHAR(MAX) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_ComKitchenRecipes_IsActive DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ComKitchenRecipes_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NULL
  );
  CREATE INDEX IX_ComKitchenRecipes_MenuItem ON dbo.ComKitchenRecipes(MenuItemId, IsActive);
  CREATE INDEX IX_ComKitchenRecipes_Ingredient ON dbo.ComKitchenRecipes(IngredientId, IsActive);
END;

IF OBJECT_ID(N'dbo.ComKitchenStockMovements', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ComKitchenStockMovements (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    IngredientId NVARCHAR(64) NOT NULL,
    IngredientName NVARCHAR(180) NOT NULL,
    UnitName NVARCHAR(80) NOT NULL,
    MovementType NVARCHAR(20) NOT NULL,
    RefType NVARCHAR(40) NULL,
    RefId NVARCHAR(64) NULL,
    RefNo NVARCHAR(80) NULL,
    MovementDate DATETIME2 NOT NULL CONSTRAINT DF_ComKitchenStockMovements_MovementDate DEFAULT SYSDATETIME(),
    QuantityIn DECIMAL(18,3) NOT NULL CONSTRAINT DF_ComKitchenStockMovements_QuantityIn DEFAULT 0,
    QuantityOut DECIMAL(18,3) NOT NULL CONSTRAINT DF_ComKitchenStockMovements_QuantityOut DEFAULT 0,
    UnitCost DECIMAL(18,2) NOT NULL CONSTRAINT DF_ComKitchenStockMovements_UnitCost DEFAULT 0,
    Amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_ComKitchenStockMovements_Amount DEFAULT 0,
    Note NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ComKitchenStockMovements_CreatedAt DEFAULT SYSDATETIME()
  );
  CREATE INDEX IX_ComKitchenStockMovements_IngredientDate ON dbo.ComKitchenStockMovements(IngredientId, MovementDate);
  CREATE INDEX IX_ComKitchenStockMovements_Ref ON dbo.ComKitchenStockMovements(RefType, RefId);
END;

IF OBJECT_ID(N'dbo.ComKitchenOrderDeductions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ComKitchenOrderDeductions (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    OrderId NVARCHAR(64) NOT NULL,
    OrderItemId NVARCHAR(64) NOT NULL,
    IngredientId NVARCHAR(64) NOT NULL,
    QuantityOut DECIMAL(18,3) NOT NULL,
    MovementId NVARCHAR(64) NOT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ComKitchenOrderDeductions_CreatedAt DEFAULT SYSDATETIME()
  );
  CREATE UNIQUE INDEX UX_ComKitchenOrderDeductions ON dbo.ComKitchenOrderDeductions(OrderItemId, IngredientId);
END;
`);

    await seedKitchenMasterData();
    schemaReadyAt = Date.now();
  }).finally(() => {
    schemaPromise = null;
  });

  return schemaPromise;
};

const seedKitchenMasterData = async () => {
  const pool = await getCaoPool();
  const units = [
    ['KG', 'kg', 'Kilogram'],
    ['QUA', 'quả', 'Đếm theo quả'],
    ['BIA', 'bìa', 'Bìa đậu/phần miếng'],
    ['BO', 'bó', 'Bó rau/gia vị'],
    ['TUI', 'túi', 'Túi/gói'],
    ['LIT', 'lít', 'Lít'],
    ['BINH', 'bình', 'Bình gas'],
  ];

  for (let index = 0; index < units.length; index += 1) {
    const [code, name, description] = units[index];
    await pool.request()
      .input('Id', sql.NVarChar(64), `unit-${code.toLowerCase()}`)
      .input('Code', sql.NVarChar(40), code)
      .input('Name', sql.NVarChar(80), name)
      .input('Description', sql.NVarChar(sql.MAX), description)
      .input('SortOrder', sql.Int, index + 1)
      .query(`
MERGE dbo.ComKitchenUnits AS target
USING (SELECT @Code AS Code) AS source ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name=@Name, Description=@Description, SortOrder=@SortOrder, IsActive=1, UpdatedAt=SYSDATETIME()
WHEN NOT MATCHED THEN INSERT (Id, Code, Name, Description, SortOrder, IsActive)
VALUES (@Id, @Code, @Name, @Description, @SortOrder, 1);
`);
  }

  const ingredients = [
    ['THIT_BA_CHI', 'Thịt ba chỉ', 'Thực phẩm tươi', 'KG', 1],
    ['THIT_CHAN_GIO', 'Thịt chân giò', 'Thực phẩm tươi', 'KG', 1],
    ['THIT_XAY', 'Thịt xay', 'Thực phẩm tươi', 'KG', 1],
    ['THIT_VAI_MEM', 'Thịt vai mềm', 'Thực phẩm tươi', 'KG', 1],
    ['THIT_BA_CHI_NACH', 'Thịt ba chỉ nách', 'Thực phẩm tươi', 'KG', 1],
    ['SUON_XAO', 'Sườn xào', 'Thực phẩm tươi', 'KG', 1],
    ['THIT_GA', 'Thịt gà', 'Thực phẩm tươi', 'KG', 1],
    ['THIT_BO', 'Thịt bò', 'Thực phẩm tươi', 'KG', 1],
    ['CA_TRAM', 'Cá trắm', 'Thực phẩm tươi', 'KG', 1],
    ['TEP_SONG', 'Tép sống', 'Thực phẩm tươi', 'KG', 0.5],
    ['DAU_PHU', 'Đậu phụ', 'Thực phẩm tươi', 'BIA', 10],
    ['TRUNG_GA', 'Trứng gà', 'Thực phẩm tươi', 'QUA', 30],
    ['TRUNG_CHIM_CUT', 'Trứng chim cút', 'Thực phẩm tươi', 'QUA', 30],
    ['GAO', 'Gạo', 'Thực phẩm tươi', 'KG', 10],
    ['RAU_MUONG', 'Rau muống', 'Rau củ', 'KG', 2],
    ['RAU_MONG_TOI', 'Rau mồng tơi', 'Rau củ', 'KG', 2],
    ['RAU_CAI_THAO', 'Rau cải thảo', 'Rau củ', 'KG', 2],
    ['DUA', 'Dứa', 'Rau củ', 'QUA', 2],
    ['HANH_LA', 'Hành lá', 'Rau củ', 'BO', 3],
    ['CA_CHUA', 'Cà chua', 'Rau củ', 'KG', 1],
    ['GUNG_TA', 'Gừng ta', 'Rau củ', 'KG', 0.3],
    ['GIEG_XAY', 'Giềng xay', 'Rau củ', 'BO', 1],
    ['CA_PHAO_TRANG', 'Cà pháo trắng', 'Rau củ', 'BO', 1],
    ['MUOP_DANG', 'Mướp đắng', 'Rau củ', 'KG', 1],
    ['CHUOI_XANH', 'Chuối xanh', 'Rau củ', 'KG', 1],
    ['LAC', 'Lạc', 'Rau củ', 'KG', 1],
    ['SAU_QUA', 'Sấu quả', 'Rau củ', 'KG', 0.5],
    ['MUI_TAU', 'Mùi tàu', 'Rau củ', 'KG', 0.5],
    ['GIA_DO', 'Giá đỗ', 'Rau củ', 'KG', 1],
    ['OT_CHUONG_XANH', 'Ớt chuông xanh', 'Rau củ', 'QUA', 1],
    ['OT_CHUONG_DO', 'Ớt chuông đỏ', 'Rau củ', 'QUA', 1],
    ['CAN_TOI_TAY', 'Cần tỏi tây', 'Rau củ', 'KG', 1],
    ['CU_HANH', 'Củ hành', 'Rau củ', 'KG', 1],
    ['CU_TOI', 'Củ tỏi', 'Rau củ', 'KG', 1],
    ['CU_SA', 'Củ sả', 'Rau củ', 'KG', 1],
    ['LA_VOI', 'Lá vối', 'Rau củ', 'BO', 1],
    ['ME_VANG', 'Me vàng', 'Rau củ', 'TUI', 1],
    ['DAU_AN', 'Dầu ăn', 'Gia vị', 'LIT', 3],
    ['NUOC_MAM', 'Nước mắm', 'Gia vị', 'LIT', 2],
    ['MI_CHINH', 'Mì chính', 'Gia vị', 'KG', 1],
    ['BOT_CANH', 'Bột canh', 'Gia vị', 'KG', 1],
    ['XI_DAU', 'Xì dầu', 'Gia vị', 'LIT', 1],
    ['MUOI', 'Muối', 'Gia vị', 'KG', 1],
    ['DUONG', 'Đường', 'Gia vị', 'KG', 1],
    ['HAT_NEM', 'Hạt nêm', 'Gia vị', 'KG', 1],
    ['BOT_NGOT', 'Bột ngọt', 'Gia vị', 'KG', 1],
    ['TIEU', 'Tiêu', 'Gia vị', 'KG', 0.3],
    ['TUONG_OT', 'Tương ớt', 'Gia vị', 'LIT', 1],
    ['TUONG_CA', 'Tương cà', 'Gia vị', 'LIT', 1],
    ['GAS', 'Gas', 'Vận hành bếp', 'BINH', 1],
  ];

  for (const [code, name, category, unitCode, minStock] of ingredients) {
    await pool.request()
      .input('Id', sql.NVarChar(64), `ing-${String(code).toLowerCase()}`)
      .input('Code', sql.NVarChar(60), code)
      .input('Name', sql.NVarChar(180), name)
      .input('Category', sql.NVarChar(80), category)
      .input('UnitCode', sql.NVarChar(40), unitCode)
      .input('MinStock', sql.Decimal(18, 3), Number(minStock))
      .query(`
DECLARE @UnitId NVARCHAR(64), @UnitName NVARCHAR(80);
SELECT TOP 1 @UnitId=Id, @UnitName=Name FROM dbo.ComKitchenUnits WHERE Code=@UnitCode;
MERGE dbo.ComKitchenIngredients AS target
USING (SELECT @Code AS Code) AS source ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name=@Name, Category=@Category, UnitId=@UnitId, UnitName=ISNULL(@UnitName, UnitName), MinStock=CASE WHEN MinStock=0 THEN @MinStock ELSE MinStock END, IsActive=1, UpdatedAt=SYSDATETIME()
WHEN NOT MATCHED THEN INSERT (Id, Code, Name, Category, UnitId, UnitName, MinStock, IsActive)
VALUES (@Id, @Code, @Name, @Category, @UnitId, ISNULL(@UnitName, @UnitCode), @MinStock, 1);
`);
  }
};

const nextEntryCode = async (date: string) => {
  const pool = await getCaoPool();
  const prefix = `NK${date.replace(/-/g, '').slice(2)}`;
  const result = await pool.request().input('Prefix', sql.NVarChar(20), prefix).query(`
SELECT ISNULL(MAX(TRY_CONVERT(INT, SUBSTRING(Code, LEN(@Prefix) + 2, 20))), 0) + 1 AS NextNo
FROM dbo.ComKitchenStockEntries
WHERE Code LIKE @Prefix + '-%';
`);
  return `${prefix}-${String(row<{ NextNo: number }>(result.recordset)?.NextNo || 1).padStart(3, '0')}`;
};

export const deductKitchenStockForPaidOrder = async (orderId: string) => {
  await ensureKitchenInventorySchema();
  const pool = await getCaoPool();
  await withSqlRetry(() => pool.request().input('OrderId', sql.NVarChar(64), orderId).query(`
DECLARE @Now DATETIME2 = SYSDATETIME();

IF OBJECT_ID('tempdb..#Consumption') IS NOT NULL DROP TABLE #Consumption;

;WITH RawConsumption AS (
  SELECT
    oi.Id AS OrderItemId,
    o.Id AS OrderId,
    o.OrderNo,
    r.IngredientId,
    r.IngredientName,
    r.UnitName,
    CAST(oi.Quantity * r.QuantityPerItem * (1 + ISNULL(r.WastePercent, 0) / 100.0) AS DECIMAL(18,3)) AS QuantityOut
  FROM dbo.ComPosOrders o
  JOIN dbo.ComPosOrderItems oi ON oi.OrderId = o.Id
  JOIN dbo.ComKitchenRecipes r ON r.MenuItemId = oi.MenuItemId AND r.IsActive = 1
  WHERE o.Id = @OrderId AND UPPER(o.Status) = 'PAID'
)
SELECT
  OrderItemId,
  OrderId,
  OrderNo,
  IngredientId,
  IngredientName,
  UnitName,
  SUM(QuantityOut) AS QuantityOut
INTO #Consumption
FROM RawConsumption
GROUP BY OrderItemId, OrderId, OrderNo, IngredientId, IngredientName, UnitName;

INSERT INTO dbo.ComKitchenStockMovements
  (Id, IngredientId, IngredientName, UnitName, MovementType, RefType, RefId, RefNo, MovementDate, QuantityOut, Note)
SELECT
  NEWID(), c.IngredientId, c.IngredientName, c.UnitName, 'OUT', 'POS_ORDER', c.OrderId, c.OrderNo, @Now, c.QuantityOut,
  N'Tự trừ tồn kho khi thanh toán POS'
FROM #Consumption c
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.ComKitchenOrderDeductions d
  WHERE d.OrderItemId = c.OrderItemId AND d.IngredientId = c.IngredientId
);

INSERT INTO dbo.ComKitchenOrderDeductions (Id, OrderId, OrderItemId, IngredientId, QuantityOut, MovementId)
SELECT NEWID(), c.OrderId, c.OrderItemId, c.IngredientId, c.QuantityOut, m.Id
FROM #Consumption c
JOIN dbo.ComKitchenStockMovements m ON m.RefType='POS_ORDER' AND m.RefId=c.OrderId AND m.IngredientId=c.IngredientId AND m.MovementDate=@Now
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.ComKitchenOrderDeductions d
  WHERE d.OrderItemId = c.OrderItemId AND d.IngredientId = c.IngredientId
);

UPDATE ing
SET CurrentStock = CurrentStock - x.QuantityOut, UpdatedAt = SYSDATETIME()
FROM dbo.ComKitchenIngredients ing
JOIN (
  SELECT IngredientId, SUM(QuantityOut) AS QuantityOut
  FROM dbo.ComKitchenStockMovements
  WHERE RefType='POS_ORDER' AND RefId=@OrderId AND MovementDate=@Now
  GROUP BY IngredientId
) x ON x.IngredientId = ing.Id;
`));
};

const buildAiInsights = (stock: any[], usage: any[], missingRecipes: any[]) => {
  const insights: any[] = [];
  const usageMap = new Map<string, number>();
  usage.forEach((item) => usageMap.set(item.IngredientId, toNumber(item.AvgDailyOut)));

  stock.forEach((item) => {
    const current = toNumber(item.CurrentStock);
    const min = toNumber(item.MinStock);
    const avg = usageMap.get(item.Id) || 0;
    if (current <= min) {
      insights.push({
        tone: current < 0 ? 'danger' : 'warning',
        title: `${item.Name} đang thấp tồn`,
        message: `Còn ${current.toLocaleString('vi-VN')} ${item.UnitName}, mức tối thiểu ${min.toLocaleString('vi-VN')} ${item.UnitName}. Nên kiểm tra bếp hoặc nhập bổ sung hôm nay.`,
      });
    } else if (avg > 0 && current / avg <= 2) {
      insights.push({
        tone: 'warning',
        title: `${item.Name} có thể hết trong ${Math.max(1, Math.ceil(current / avg))} ngày`,
        message: `7 ngày gần nhất dùng trung bình ${avg.toLocaleString('vi-VN')} ${item.UnitName}/ngày. Nên lên lịch nhập trước khi hết.`,
      });
    }
  });

  missingRecipes.slice(0, 5).forEach((item) => {
    insights.push({
      tone: 'info',
      title: `Món "${item.Name}" chưa có định lượng`,
      message: 'Món vẫn bán được nhưng khi thanh toán sẽ chưa tự trừ kho. Nên thêm công thức để kiểm soát thất thoát.',
    });
  });

  if (!insights.length) {
    insights.push({
      tone: 'good',
      title: 'Kho bếp đang ổn',
      message: 'Chưa thấy nguyên liệu thấp tồn hoặc món bán thiếu định lượng trong dữ liệu hiện tại.',
    });
  }

  return insights;
};

export const getKitchenInventoryBootstrap = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureKitchenInventorySchema();
    const pool = await getCaoPool();
    const date = String(req.query.date || todayKey());
    const result = await pool.request().input('Date', sql.NVarChar(10), date).query(`
DECLARE @WorkDate DATE = TRY_CONVERT(DATE, @Date, 23);

SELECT * FROM dbo.ComKitchenUnits WHERE IsActive=1 ORDER BY SortOrder, Name;
SELECT * FROM dbo.ComKitchenIngredients WHERE IsActive=1 ORDER BY Category, Name;
SELECT * FROM dbo.ComPosMenuItems WHERE IsActive=1 ORDER BY SortOrder, Name;
SELECT r.* FROM dbo.ComKitchenRecipes r WHERE r.IsActive=1 ORDER BY r.MenuItemName, r.IngredientName;
SELECT TOP 20 * FROM dbo.ComKitchenStockEntries ORDER BY EntryDate DESC, CreatedAt DESC;

SELECT
  i.Id,
  i.Name,
  i.Category,
  i.UnitName,
  i.CurrentStock,
  i.MinStock,
  ISNULL(SUM(CASE WHEN CAST(m.MovementDate AS DATE)=@WorkDate THEN m.QuantityIn ELSE 0 END), 0) AS InToday,
  ISNULL(SUM(CASE WHEN CAST(m.MovementDate AS DATE)=@WorkDate THEN m.QuantityOut ELSE 0 END), 0) AS OutToday
FROM dbo.ComKitchenIngredients i
LEFT JOIN dbo.ComKitchenStockMovements m ON m.IngredientId=i.Id
WHERE i.IsActive=1
GROUP BY i.Id, i.Name, i.Category, i.UnitName, i.CurrentStock, i.MinStock
ORDER BY i.Category, i.Name;

SELECT
  IngredientId,
  CAST(SUM(QuantityOut) / 7.0 AS DECIMAL(18,3)) AS AvgDailyOut,
  SUM(QuantityOut) AS TotalOut7Days
FROM dbo.ComKitchenStockMovements
WHERE MovementType='OUT' AND MovementDate >= DATEADD(DAY, -7, @WorkDate)
GROUP BY IngredientId;

SELECT TOP 20 i.Id, i.Code, i.Name
FROM dbo.ComPosMenuItems i
WHERE i.IsActive=1
  AND NOT EXISTS (SELECT 1 FROM dbo.ComKitchenRecipes r WHERE r.MenuItemId=i.Id AND r.IsActive=1)
ORDER BY i.SortOrder, i.Name;
`);

    const recordsets = result.recordsets as sql.IRecordSet<any>[];
    const stock = recordsets[5] || [];
    const usage = recordsets[6] || [];
    const missingRecipes = recordsets[7] || [];
    res.json({
      success: true,
      data: {
        units: recordsets[0] || [],
        ingredients: recordsets[1] || [],
        menuItems: recordsets[2] || [],
        recipes: recordsets[3] || [],
        recentEntries: recordsets[4] || [],
        stock,
        usage7Days: usage,
        missingRecipes,
        aiInsights: buildAiInsights(recordsets[1] || [], usage, missingRecipes),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không tải được kho bếp.' });
  }
};

export const upsertKitchenUnit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureKitchenInventorySchema();
    const pool = await getCaoPool();
    const id = req.params.id || req.body.id || newId();
    await pool.request()
      .input('Id', sql.NVarChar(64), id)
      .input('Code', sql.NVarChar(40), String(req.body.code || '').trim().toUpperCase())
      .input('Name', sql.NVarChar(80), String(req.body.name || '').trim())
      .input('Description', sql.NVarChar(sql.MAX), req.body.description || null)
      .input('SortOrder', sql.Int, Number(req.body.sortOrder || 0))
      .input('IsActive', sql.Bit, req.body.isActive === undefined ? true : toBool(req.body.isActive))
      .query(`
MERGE dbo.ComKitchenUnits AS target
USING (SELECT @Id AS Id) AS source ON target.Id=source.Id
WHEN MATCHED THEN UPDATE SET Code=@Code, Name=@Name, Description=@Description, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=SYSDATETIME()
WHEN NOT MATCHED THEN INSERT (Id, Code, Name, Description, SortOrder, IsActive)
VALUES (@Id, @Code, @Name, @Description, @SortOrder, @IsActive);
`);
    res.json({ success: true, data: { id } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không lưu được đơn vị.' });
  }
};

export const deleteKitchenUnit = async (req: AuthenticatedRequest, res: Response) => {
  await ensureKitchenInventorySchema();
  const pool = await getCaoPool();
  await pool.request().input('Id', sql.NVarChar(64), req.params.id).query('UPDATE dbo.ComKitchenUnits SET IsActive=0, UpdatedAt=SYSDATETIME() WHERE Id=@Id');
  res.json({ success: true });
};

export const upsertKitchenIngredient = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureKitchenInventorySchema();
    const pool = await getCaoPool();
    const id = req.params.id || req.body.id || newId();
    const unit = row<any>((await pool.request().input('UnitId', sql.NVarChar(64), req.body.unitId || null).query('SELECT TOP 1 * FROM dbo.ComKitchenUnits WHERE Id=@UnitId')).recordset);
    await pool.request()
      .input('Id', sql.NVarChar(64), id)
      .input('Code', sql.NVarChar(60), String(req.body.code || '').trim().toUpperCase())
      .input('Name', sql.NVarChar(180), String(req.body.name || '').trim())
      .input('Category', sql.NVarChar(80), req.body.category || null)
      .input('UnitId', sql.NVarChar(64), unit?.Id || null)
      .input('UnitName', sql.NVarChar(80), unit?.Name || req.body.unitName || '')
      .input('CurrentStock', sql.Decimal(18, 3), toNumber(req.body.currentStock))
      .input('MinStock', sql.Decimal(18, 3), toNumber(req.body.minStock))
      .input('LastCost', sql.Decimal(18, 2), toNumber(req.body.lastCost))
      .input('IsActive', sql.Bit, req.body.isActive === undefined ? true : toBool(req.body.isActive))
      .query(`
MERGE dbo.ComKitchenIngredients AS target
USING (SELECT @Id AS Id) AS source ON target.Id=source.Id
WHEN MATCHED THEN UPDATE SET Code=@Code, Name=@Name, Category=@Category, UnitId=@UnitId, UnitName=@UnitName, CurrentStock=@CurrentStock, MinStock=@MinStock, LastCost=@LastCost, IsActive=@IsActive, UpdatedAt=SYSDATETIME()
WHEN NOT MATCHED THEN INSERT (Id, Code, Name, Category, UnitId, UnitName, CurrentStock, MinStock, LastCost, IsActive)
VALUES (@Id, @Code, @Name, @Category, @UnitId, @UnitName, @CurrentStock, @MinStock, @LastCost, @IsActive);
`);
    res.json({ success: true, data: { id } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không lưu được nguyên liệu.' });
  }
};

export const deleteKitchenIngredient = async (req: AuthenticatedRequest, res: Response) => {
  await ensureKitchenInventorySchema();
  const pool = await getCaoPool();
  await pool.request().input('Id', sql.NVarChar(64), req.params.id).query('UPDATE dbo.ComKitchenIngredients SET IsActive=0, UpdatedAt=SYSDATETIME() WHERE Id=@Id');
  res.json({ success: true });
};

export const createKitchenStockEntry = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureKitchenInventorySchema();
    const pool = await getCaoPool();
    const entryDate = String(req.body.entryDate || todayKey());
    const lines = Array.isArray(req.body.lines) ? req.body.lines.filter((line: any) => line.ingredientId && toNumber(line.quantity) > 0) : [];
    if (!lines.length) return res.status(400).json({ success: false, message: 'Vui lòng nhập ít nhất một nguyên liệu.' });

    const entryId = newId();
    const code = await nextEntryCode(entryDate);
    const total = lines.reduce((sum: number, line: any) => sum + toNumber(line.quantity) * toNumber(line.unitCost), 0);
    await pool.request()
      .input('Id', sql.NVarChar(64), entryId)
      .input('Code', sql.NVarChar(60), code)
      .input('EntryDate', sql.NVarChar(10), entryDate)
      .input('SupplierName', sql.NVarChar(180), req.body.supplierName || null)
      .input('Note', sql.NVarChar(sql.MAX), req.body.note || null)
      .input('TotalAmount', sql.Decimal(18, 2), total)
      .input('CreatedBy', sql.NVarChar(160), req.user?.email || null)
      .query('INSERT INTO dbo.ComKitchenStockEntries (Id, Code, EntryDate, SupplierName, Note, TotalAmount, CreatedBy) VALUES (@Id, @Code, TRY_CONVERT(DATE, @EntryDate, 23), @SupplierName, @Note, @TotalAmount, @CreatedBy)');

    for (const line of lines) {
      const ingredient = row<any>((await pool.request().input('Id', sql.NVarChar(64), line.ingredientId).query('SELECT TOP 1 * FROM dbo.ComKitchenIngredients WHERE Id=@Id')).recordset);
      if (!ingredient) continue;
      const quantity = toNumber(line.quantity);
      const unitCost = toNumber(line.unitCost);
      const amount = quantity * unitCost;
      const lineId = newId();
      await pool.request()
        .input('Id', sql.NVarChar(64), lineId)
        .input('EntryId', sql.NVarChar(64), entryId)
        .input('IngredientId', sql.NVarChar(64), ingredient.Id)
        .input('IngredientName', sql.NVarChar(180), ingredient.Name)
        .input('UnitId', sql.NVarChar(64), ingredient.UnitId)
        .input('UnitName', sql.NVarChar(80), ingredient.UnitName)
        .input('Quantity', sql.Decimal(18, 3), quantity)
        .input('UnitCost', sql.Decimal(18, 2), unitCost)
        .input('Amount', sql.Decimal(18, 2), amount)
        .input('Note', sql.NVarChar(sql.MAX), line.note || null)
        .query('INSERT INTO dbo.ComKitchenStockEntryLines (Id, EntryId, IngredientId, IngredientName, UnitId, UnitName, Quantity, UnitCost, Amount, Note) VALUES (@Id, @EntryId, @IngredientId, @IngredientName, @UnitId, @UnitName, @Quantity, @UnitCost, @Amount, @Note)');
      await pool.request()
        .input('Id', sql.NVarChar(64), newId())
        .input('IngredientId', sql.NVarChar(64), ingredient.Id)
        .input('IngredientName', sql.NVarChar(180), ingredient.Name)
        .input('UnitName', sql.NVarChar(80), ingredient.UnitName)
        .input('RefId', sql.NVarChar(64), entryId)
        .input('RefNo', sql.NVarChar(80), code)
        .input('MovementDate', sql.NVarChar(10), entryDate)
        .input('QuantityIn', sql.Decimal(18, 3), quantity)
        .input('UnitCost', sql.Decimal(18, 2), unitCost)
        .input('Amount', sql.Decimal(18, 2), amount)
        .query(`INSERT INTO dbo.ComKitchenStockMovements (Id, IngredientId, IngredientName, UnitName, MovementType, RefType, RefId, RefNo, MovementDate, QuantityIn, UnitCost, Amount, Note)
          VALUES (@Id, @IngredientId, @IngredientName, @UnitName, 'IN', 'STOCK_ENTRY', @RefId, @RefNo, TRY_CONVERT(DATE, @MovementDate, 23), @QuantityIn, @UnitCost, @Amount, N'Nhập kho bếp')`);
      await pool.request()
        .input('IngredientId', sql.NVarChar(64), ingredient.Id)
        .input('Quantity', sql.Decimal(18, 3), quantity)
        .input('UnitCost', sql.Decimal(18, 2), unitCost)
        .query('UPDATE dbo.ComKitchenIngredients SET CurrentStock=CurrentStock+@Quantity, LastCost=CASE WHEN @UnitCost>0 THEN @UnitCost ELSE LastCost END, UpdatedAt=SYSDATETIME() WHERE Id=@IngredientId');
    }

    res.json({ success: true, data: { id: entryId, code } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không tạo được phiếu nhập kho.' });
  }
};

export const upsertKitchenRecipe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureKitchenInventorySchema();
    const pool = await getCaoPool();
    const id = req.params.id || req.body.id || newId();
    const menu = row<any>((await pool.request().input('Id', sql.NVarChar(64), req.body.menuItemId).query('SELECT TOP 1 * FROM dbo.ComPosMenuItems WHERE Id=@Id')).recordset);
    const ingredient = row<any>((await pool.request().input('Id', sql.NVarChar(64), req.body.ingredientId).query('SELECT TOP 1 * FROM dbo.ComKitchenIngredients WHERE Id=@Id')).recordset);
    if (!menu || !ingredient) return res.status(400).json({ success: false, message: 'Vui lòng chọn món POS và nguyên liệu.' });
    await pool.request()
      .input('Id', sql.NVarChar(64), id)
      .input('MenuItemId', sql.NVarChar(64), menu.Id)
      .input('MenuItemCode', sql.NVarChar(80), menu.Code)
      .input('MenuItemName', sql.NVarChar(220), menu.Name)
      .input('IngredientId', sql.NVarChar(64), ingredient.Id)
      .input('IngredientName', sql.NVarChar(180), ingredient.Name)
      .input('UnitId', sql.NVarChar(64), ingredient.UnitId)
      .input('UnitName', sql.NVarChar(80), ingredient.UnitName)
      .input('QuantityPerItem', sql.Decimal(18, 3), toNumber(req.body.quantityPerItem))
      .input('WastePercent', sql.Decimal(10, 2), toNumber(req.body.wastePercent))
      .input('Note', sql.NVarChar(sql.MAX), req.body.note || null)
      .input('IsActive', sql.Bit, req.body.isActive === undefined ? true : toBool(req.body.isActive))
      .query(`
MERGE dbo.ComKitchenRecipes AS target
USING (SELECT @Id AS Id) AS source ON target.Id=source.Id
WHEN MATCHED THEN UPDATE SET MenuItemId=@MenuItemId, MenuItemCode=@MenuItemCode, MenuItemName=@MenuItemName, IngredientId=@IngredientId, IngredientName=@IngredientName, UnitId=@UnitId, UnitName=@UnitName, QuantityPerItem=@QuantityPerItem, WastePercent=@WastePercent, Note=@Note, IsActive=@IsActive, UpdatedAt=SYSDATETIME()
WHEN NOT MATCHED THEN INSERT (Id, MenuItemId, MenuItemCode, MenuItemName, IngredientId, IngredientName, UnitId, UnitName, QuantityPerItem, WastePercent, Note, IsActive)
VALUES (@Id, @MenuItemId, @MenuItemCode, @MenuItemName, @IngredientId, @IngredientName, @UnitId, @UnitName, @QuantityPerItem, @WastePercent, @Note, @IsActive);
`);
    res.json({ success: true, data: { id } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không lưu được định lượng món.' });
  }
};

export const deleteKitchenRecipe = async (req: AuthenticatedRequest, res: Response) => {
  await ensureKitchenInventorySchema();
  const pool = await getCaoPool();
  await pool.request().input('Id', sql.NVarChar(64), req.params.id).query('UPDATE dbo.ComKitchenRecipes SET IsActive=0, UpdatedAt=SYSDATETIME() WHERE Id=@Id');
  res.json({ success: true });
};
