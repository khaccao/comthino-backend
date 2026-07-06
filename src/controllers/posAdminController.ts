import { Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma';
import { getCaoPool, sql } from '../config/caoSql';
import { AuthenticatedRequest } from '../middlewares/auth';

type Money = number | string | null | undefined;

const toNumber = (value: Money) => Number(value || 0);
const toBool = (value: unknown) => value === true || value === 'true' || value === 1 || value === '1';
const newId = () => crypto.randomUUID();
const defaultPaymentSetting = {
  BankBin: '970407',
  BankCode: 'TCB',
  BankName: 'Techcombank',
  AccountNo: '19035748277012',
  AccountName: 'NGUYEN KHAC CAO',
  QrTemplate: 'compact2',
};

const row = <T>(recordset: T[]) => recordset[0] || null;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isDeadlock = (error: any) => error?.number === 1205 || /deadlock/i.test(error?.message || '');
const cleanTransferInfo = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, 100);

const withSqlRetry = async <T>(operation: () => Promise<T>, attempts = 3): Promise<T> => {
  let lastError: any;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (!isDeadlock(error) || attempt === attempts) break;
      await sleep(180 * attempt);
    }
  }
  throw lastError;
};

let schemaReadyAt = 0;
let schemaPromise: Promise<void> | null = null;

const ensurePosSchema = async (syncData = false) => {
  if (!syncData && schemaReadyAt && Date.now() - schemaReadyAt < 5 * 60 * 1000) return;
  if (schemaPromise) return schemaPromise;

  schemaPromise = withSqlRetry(async () => {
  const pool = await getCaoPool();

  await pool.request().batch(`
IF OBJECT_ID(N'dbo.ComPosTables', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ComPosTables (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    Code NVARCHAR(50) NOT NULL,
    Name NVARCHAR(120) NOT NULL,
    AreaName NVARCHAR(120) NULL,
    SeatCount INT NOT NULL CONSTRAINT DF_ComPosTables_SeatCount DEFAULT 4,
    PositionX INT NOT NULL CONSTRAINT DF_ComPosTables_PositionX DEFAULT 0,
    PositionY INT NOT NULL CONSTRAINT DF_ComPosTables_PositionY DEFAULT 0,
    Width INT NOT NULL CONSTRAINT DF_ComPosTables_Width DEFAULT 130,
    Height INT NOT NULL CONSTRAINT DF_ComPosTables_Height DEFAULT 100,
    Shape NVARCHAR(20) NOT NULL CONSTRAINT DF_ComPosTables_Shape DEFAULT 'RECT',
    SortOrder INT NOT NULL CONSTRAINT DF_ComPosTables_SortOrder DEFAULT 0,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_ComPosTables_Status DEFAULT 'AVAILABLE',
    IsActive BIT NOT NULL CONSTRAINT DF_ComPosTables_IsActive DEFAULT 1,
    SourceGuid NVARCHAR(64) NULL,
    SourceTable NVARCHAR(80) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ComPosTables_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NULL
  );
  CREATE UNIQUE INDEX UX_ComPosTables_Code ON dbo.ComPosTables(Code);
END;

IF OBJECT_ID(N'dbo.ComPosMenuCategories', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ComPosMenuCategories (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    Name NVARCHAR(160) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    SortOrder INT NOT NULL CONSTRAINT DF_ComPosMenuCategories_SortOrder DEFAULT 0,
    IsActive BIT NOT NULL CONSTRAINT DF_ComPosMenuCategories_IsActive DEFAULT 1,
    SourceGuid NVARCHAR(64) NULL,
    SourceTable NVARCHAR(80) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ComPosMenuCategories_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NULL
  );
END;

IF OBJECT_ID(N'dbo.ComPosMenuItems', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ComPosMenuItems (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    CategoryId NVARCHAR(64) NULL,
    Code NVARCHAR(80) NOT NULL,
    Name NVARCHAR(220) NOT NULL,
    Unit NVARCHAR(40) NOT NULL CONSTRAINT DF_ComPosMenuItems_Unit DEFAULT N'phần',
    Price DECIMAL(18,2) NOT NULL CONSTRAINT DF_ComPosMenuItems_Price DEFAULT 0,
    ImageUrl NVARCHAR(MAX) NULL,
    Description NVARCHAR(MAX) NULL,
    SortOrder INT NOT NULL CONSTRAINT DF_ComPosMenuItems_SortOrder DEFAULT 0,
    IsActive BIT NOT NULL CONSTRAINT DF_ComPosMenuItems_IsActive DEFAULT 1,
    SourceGuid NVARCHAR(64) NULL,
    SourceTable NVARCHAR(80) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ComPosMenuItems_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NULL
  );
  CREATE UNIQUE INDEX UX_ComPosMenuItems_Code ON dbo.ComPosMenuItems(Code);
END;

IF OBJECT_ID(N'dbo.ComPosOrders', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ComPosOrders (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    OrderNo NVARCHAR(60) NOT NULL,
    TableId NVARCHAR(64) NOT NULL,
    TableName NVARCHAR(120) NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_ComPosOrders_Status DEFAULT 'OPEN',
    Note NVARCHAR(MAX) NULL,
    SubTotal DECIMAL(18,2) NOT NULL CONSTRAINT DF_ComPosOrders_SubTotal DEFAULT 0,
    DiscountAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_ComPosOrders_Discount DEFAULT 0,
    ServiceCharge DECIMAL(18,2) NOT NULL CONSTRAINT DF_ComPosOrders_Service DEFAULT 0,
    VatAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_ComPosOrders_Vat DEFAULT 0,
    TotalAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_ComPosOrders_Total DEFAULT 0,
    PaymentQrUrl NVARCHAR(1000) NULL,
    PaymentMethod NVARCHAR(40) NULL,
    KitchenPrintedAt DATETIME2 NULL,
    PaidAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ComPosOrders_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NULL
  );
  CREATE UNIQUE INDEX UX_ComPosOrders_OrderNo ON dbo.ComPosOrders(OrderNo);
  CREATE INDEX IX_ComPosOrders_Table_Status ON dbo.ComPosOrders(TableId, Status);
  CREATE INDEX IX_ComPosOrders_CreatedAt ON dbo.ComPosOrders(CreatedAt);
END;

IF OBJECT_ID(N'dbo.ComPosOrderItems', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ComPosOrderItems (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    OrderId NVARCHAR(64) NOT NULL,
    MenuItemId NVARCHAR(64) NULL,
    Code NVARCHAR(80) NULL,
    Name NVARCHAR(220) NOT NULL,
    UnitPrice DECIMAL(18,2) NOT NULL CONSTRAINT DF_ComPosOrderItems_UnitPrice DEFAULT 0,
    Quantity DECIMAL(18,2) NOT NULL CONSTRAINT DF_ComPosOrderItems_Quantity DEFAULT 1,
    Note NVARCHAR(MAX) NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_ComPosOrderItems_Status DEFAULT 'NEW',
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ComPosOrderItems_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NULL
  );
  CREATE INDEX IX_ComPosOrderItems_OrderId ON dbo.ComPosOrderItems(OrderId);
END;

IF OBJECT_ID(N'dbo.ComPosPrintTemplates', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ComPosPrintTemplates (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    Code NVARCHAR(40) NOT NULL,
    Name NVARCHAR(120) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_ComPosPrintTemplates_UpdatedAt DEFAULT SYSDATETIME()
  );
  CREATE UNIQUE INDEX UX_ComPosPrintTemplates_Code ON dbo.ComPosPrintTemplates(Code);
END;

IF OBJECT_ID(N'dbo.ComPosPaymentSettings', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ComPosPaymentSettings (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    BankBin NVARCHAR(20) NOT NULL,
    BankCode NVARCHAR(50) NOT NULL,
    BankName NVARCHAR(200) NOT NULL,
    AccountNo NVARCHAR(80) NOT NULL,
    AccountName NVARCHAR(200) NOT NULL,
    QrTemplate NVARCHAR(50) NOT NULL CONSTRAINT DF_ComPosPaymentSettings_QrTemplate DEFAULT 'compact2',
    IsActive BIT NOT NULL CONSTRAINT DF_ComPosPaymentSettings_IsActive DEFAULT 1,
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_ComPosPaymentSettings_UpdatedAt DEFAULT SYSDATETIME()
  );
END;
`);

  await pool.request().batch(`
IF COL_LENGTH('dbo.ComPosTables', 'PositionX') IS NULL ALTER TABLE dbo.ComPosTables ADD PositionX INT NOT NULL CONSTRAINT DF_ComPosTables_PositionX_Alter DEFAULT 0;
IF COL_LENGTH('dbo.ComPosTables', 'PositionY') IS NULL ALTER TABLE dbo.ComPosTables ADD PositionY INT NOT NULL CONSTRAINT DF_ComPosTables_PositionY_Alter DEFAULT 0;
IF COL_LENGTH('dbo.ComPosTables', 'Width') IS NULL ALTER TABLE dbo.ComPosTables ADD Width INT NOT NULL CONSTRAINT DF_ComPosTables_Width_Alter DEFAULT 130;
IF COL_LENGTH('dbo.ComPosTables', 'Height') IS NULL ALTER TABLE dbo.ComPosTables ADD Height INT NOT NULL CONSTRAINT DF_ComPosTables_Height_Alter DEFAULT 100;
IF COL_LENGTH('dbo.ComPosTables', 'Shape') IS NULL ALTER TABLE dbo.ComPosTables ADD Shape NVARCHAR(20) NOT NULL CONSTRAINT DF_ComPosTables_Shape_Alter DEFAULT 'RECT';
IF COL_LENGTH('dbo.ComPosTables', 'SourceGuid') IS NULL ALTER TABLE dbo.ComPosTables ADD SourceGuid NVARCHAR(64) NULL;
IF COL_LENGTH('dbo.ComPosTables', 'SourceTable') IS NULL ALTER TABLE dbo.ComPosTables ADD SourceTable NVARCHAR(80) NULL;
IF COL_LENGTH('dbo.ComPosMenuCategories', 'SourceGuid') IS NULL ALTER TABLE dbo.ComPosMenuCategories ADD SourceGuid NVARCHAR(64) NULL;
IF COL_LENGTH('dbo.ComPosMenuCategories', 'SourceTable') IS NULL ALTER TABLE dbo.ComPosMenuCategories ADD SourceTable NVARCHAR(80) NULL;
IF COL_LENGTH('dbo.ComPosMenuItems', 'SourceGuid') IS NULL ALTER TABLE dbo.ComPosMenuItems ADD SourceGuid NVARCHAR(64) NULL;
IF COL_LENGTH('dbo.ComPosMenuItems', 'SourceTable') IS NULL ALTER TABLE dbo.ComPosMenuItems ADD SourceTable NVARCHAR(80) NULL;
IF COL_LENGTH('dbo.ComPosOrders', 'PaymentQrUrl') IS NULL ALTER TABLE dbo.ComPosOrders ADD PaymentQrUrl NVARCHAR(1000) NULL;
`);

  if (syncData) {
    await syncHotelPosData();
  }
  await seedFallbackPosData();
  await seedPaymentSetting();
  schemaReadyAt = Date.now();
  }).finally(() => {
    schemaPromise = null;
  });

  return schemaPromise;
};

const defaultTemplates = [
  {
    code: 'KITCHEN',
    name: 'Phiếu bếp',
    content:
      '<section class="pos-print"><header><b>CƠM THỊ NỞ</b><strong>BẾP</strong><span>Check No: {{OrderNo}}</span><span>Bàn: {{TableName}}</span><span>{{CreatedAt}}</span></header><table><thead><tr><th>Món</th><th>SL</th><th>Ghi chú</th></tr></thead><tbody>{{Items}}</tbody></table><footer><div>{{OrderNote}}</div></footer></section>',
  },
  {
    code: 'TEMPORARY',
    name: 'Hóa đơn tạm',
    content:
      '<section class="pos-print"><header><b>CƠM THỊ NỞ</b><strong>TẠM TÍNH</strong><span>Check No: {{OrderNo}}</span><span>Bàn: {{TableName}}</span><span>{{CreatedAt}}</span></header><table><thead><tr><th>Món</th><th>SL</th><th>Giá</th><th>Tiền</th></tr></thead><tbody>{{Items}}</tbody></table><footer><div><span>Tạm tính</span><b>{{SubTotal}}</b></div><div><span>Giảm giá</span><b>{{DiscountAmount}}</b></div><div class="total"><span>Tổng</span><b>{{TotalAmount}}</b></div></footer></section>',
  },
  {
    code: 'PAYMENT',
    name: 'Thanh toán',
    content:
      '<section class="pos-print"><header><b>CƠM THỊ NỞ</b><strong>THANH TOÁN</strong><span>Check No: {{OrderNo}}</span><span>Bàn: {{TableName}}</span><span>{{CreatedAt}}</span></header><table><thead><tr><th>Món</th><th>SL</th><th>Giá</th><th>Tiền</th></tr></thead><tbody>{{Items}}</tbody></table><footer><div><span>Tạm tính</span><b>{{SubTotal}}</b></div><div><span>Phí dịch vụ</span><b>{{ServiceCharge}}</b></div><div><span>VAT</span><b>{{VatAmount}}</b></div><div><span>Giảm giá</span><b>{{DiscountAmount}}</b></div><div class="total"><span>Tổng tiền</span><b>{{TotalAmount}}</b></div><img src="{{PaymentQrUrl}}" alt="Payment QR" /><div class="qr-text">QUÉT MÃ QR ĐỂ THANH TOÁN</div></footer></section>',
  },
];

const syncHotelPosData = async () => {
  const pool = await getCaoPool();

  const sourceTableCount = row<{ total: number }>((await pool.request().query(`
    SELECT COUNT(1) AS total
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='PosTables'
  `)).recordset);

  if (sourceTableCount?.total) {
    await pool.request().query(`
MERGE dbo.ComPosTables AS target
USING (
  SELECT
    CONVERT(NVARCHAR(64), Guid) AS Id,
    Code,
    Name,
    AreaName,
    Seats AS SeatCount,
    PositionX,
    PositionY,
    Width,
    Height,
    Shape,
    Id AS SortOrder,
    CASE WHEN Status IN ('OCCUPIED', 'BUSY') THEN 'OCCUPIED' ELSE 'AVAILABLE' END AS Status,
    IsActive,
    CONVERT(NVARCHAR(64), Guid) AS SourceGuid
  FROM dbo.PosTables
) AS source ON target.SourceGuid = source.SourceGuid OR target.Id = source.Id OR target.Code = source.Code
WHEN MATCHED THEN UPDATE SET
  target.Id = source.Id,
  target.Code = source.Code,
  target.Name = source.Name,
  target.AreaName = source.AreaName,
  target.SeatCount = source.SeatCount,
  target.PositionX = source.PositionX,
  target.PositionY = source.PositionY,
  target.Width = source.Width,
  target.Height = source.Height,
  target.Shape = source.Shape,
  target.SortOrder = source.SortOrder,
  target.Status = CASE WHEN EXISTS (SELECT 1 FROM dbo.ComPosOrders o WHERE o.TableId = target.Id AND o.Status IN ('OPEN','ORDERED') AND (${activeOrderWhere})) THEN 'OCCUPIED' ELSE source.Status END,
  target.IsActive = source.IsActive,
  target.SourceGuid = source.SourceGuid,
  target.SourceTable = 'PosTables',
  target.UpdatedAt = SYSDATETIME()
WHEN NOT MATCHED THEN INSERT
  (Id, Code, Name, AreaName, SeatCount, PositionX, PositionY, Width, Height, Shape, SortOrder, Status, IsActive, SourceGuid, SourceTable)
  VALUES
  (source.Id, source.Code, source.Name, source.AreaName, source.SeatCount, source.PositionX, source.PositionY, source.Width, source.Height, source.Shape, source.SortOrder, source.Status, source.IsActive, source.SourceGuid, 'PosTables');
`);
    await pool.request().query(`
UPDATE t SET IsActive = 0, UpdatedAt = SYSDATETIME()
FROM dbo.ComPosTables t
WHERE t.SourceTable = 'PosTables'
  AND NOT EXISTS (SELECT 1 FROM dbo.PosTables p WHERE CONVERT(NVARCHAR(64), p.Guid) = t.SourceGuid);
`);
  }

  const sourceCategoryCount = row<{ total: number }>((await pool.request().query(`
    SELECT COUNT(1) AS total
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='PosMenuCategories'
  `)).recordset);
  if (sourceCategoryCount?.total) {
    await pool.request().query(`
MERGE dbo.ComPosMenuCategories AS target
USING (
  SELECT CONVERT(NVARCHAR(64), Guid) AS Id, Code, Name, SortOrder, IsActive, CONVERT(NVARCHAR(64), Guid) AS SourceGuid
  FROM dbo.PosMenuCategories
) AS source ON target.SourceGuid = source.SourceGuid OR target.Id = source.Id OR target.Name = source.Name
WHEN MATCHED THEN UPDATE SET
  target.Id = source.Id,
  target.Name = source.Name,
  target.Description = source.Code,
  target.SortOrder = source.SortOrder,
  target.IsActive = source.IsActive,
  target.SourceGuid = source.SourceGuid,
  target.SourceTable = 'PosMenuCategories',
  target.UpdatedAt = SYSDATETIME()
WHEN NOT MATCHED THEN INSERT (Id, Name, Description, SortOrder, IsActive, SourceGuid, SourceTable)
  VALUES (source.Id, source.Name, source.Code, source.SortOrder, source.IsActive, source.SourceGuid, 'PosMenuCategories');
`);
    await pool.request().query(`
UPDATE c SET IsActive = 0, UpdatedAt = SYSDATETIME()
FROM dbo.ComPosMenuCategories c
WHERE ISNULL(c.SourceTable, '') <> 'PosMenuCategories';
`);
  }

  const sourceItemCount = row<{ total: number }>((await pool.request().query(`
    SELECT COUNT(1) AS total
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='PosMenuItems'
  `)).recordset);
  if (sourceItemCount?.total) {
    await pool.request().query(`
MERGE dbo.ComPosMenuItems AS target
USING (
  SELECT
    CONVERT(NVARCHAR(64), i.Guid) AS Id,
    CONVERT(NVARCHAR(64), i.CategoryGuid) AS CategoryId,
    i.Code,
    i.Name,
    i.Unit,
    i.Price,
    CAST(NULL AS NVARCHAR(MAX)) AS ImageUrl,
    i.Description,
    i.SortOrder,
    i.IsActive,
    CONVERT(NVARCHAR(64), i.Guid) AS SourceGuid
  FROM dbo.PosMenuItems i
) AS source ON target.SourceGuid = source.SourceGuid OR target.Id = source.Id OR target.Code = source.Code
WHEN MATCHED THEN UPDATE SET
  target.Id = source.Id,
  target.CategoryId = source.CategoryId,
  target.Code = source.Code,
  target.Name = source.Name,
  target.Unit = source.Unit,
  target.Price = source.Price,
  target.ImageUrl = source.ImageUrl,
  target.Description = source.Description,
  target.SortOrder = source.SortOrder,
  target.IsActive = source.IsActive,
  target.SourceGuid = source.SourceGuid,
  target.SourceTable = 'PosMenuItems',
  target.UpdatedAt = SYSDATETIME()
WHEN NOT MATCHED THEN INSERT (Id, CategoryId, Code, Name, Unit, Price, ImageUrl, Description, SortOrder, IsActive, SourceGuid, SourceTable)
  VALUES (source.Id, source.CategoryId, source.Code, source.Name, source.Unit, source.Price, source.ImageUrl, source.Description, source.SortOrder, source.IsActive, source.SourceGuid, 'PosMenuItems');
`);
    await pool.request().query(`
UPDATE i SET IsActive = 0, UpdatedAt = SYSDATETIME()
FROM dbo.ComPosMenuItems i
WHERE ISNULL(i.SourceTable, '') <> 'PosMenuItems';
`);
  }

  await seedPrintTemplates(pool);
};

const seedFallbackPosData = async () => {
  const pool = await getCaoPool();
  const tableCount = row<{ total: number }>((await pool.request().query('SELECT COUNT(1) AS total FROM dbo.ComPosTables')).recordset);
  if (!tableCount?.total) {
    const tables = ['H1', 'H2', 'H3', 'H4', 'B1', 'B2', 'B3', 'B4'];
    for (let index = 0; index < tables.length; index += 1) {
      await pool
        .request()
        .input('Id', sql.NVarChar(64), newId())
        .input('Code', sql.NVarChar(50), tables[index])
        .input('Name', sql.NVarChar(120), tables[index])
        .input('AreaName', sql.NVarChar(120), tables[index].startsWith('H') ? 'Nhà hàng' : 'Ban công')
        .input('PositionX', sql.Int, 24 + (index % 4) * 150)
        .input('PositionY', sql.Int, 24 + Math.floor(index / 4) * 130)
        .input('SortOrder', sql.Int, index + 1)
        .query(`INSERT INTO dbo.ComPosTables
          (Id, Code, Name, AreaName, PositionX, PositionY, SortOrder)
          VALUES (@Id, @Code, @Name, @AreaName, @PositionX, @PositionY, @SortOrder)`);
    }
  }

  const categoryCount = row<{ total: number }>((await pool.request().query('SELECT COUNT(1) AS total FROM dbo.ComPosMenuCategories')).recordset);
  if (!categoryCount?.total) {
    const webCategories = await prisma.menuCategory.findMany({ orderBy: { displayOrder: 'asc' } });
    for (const category of webCategories) {
      await pool
        .request()
        .input('Id', sql.NVarChar(64), category.id)
        .input('Name', sql.NVarChar(160), category.name)
        .input('Description', sql.NVarChar(sql.MAX), category.description || null)
        .input('SortOrder', sql.Int, category.displayOrder)
        .input('IsActive', sql.Bit, category.isActive)
        .query('INSERT INTO dbo.ComPosMenuCategories (Id, Name, Description, SortOrder, IsActive) VALUES (@Id, @Name, @Description, @SortOrder, @IsActive)');
    }
  }

  const itemCount = row<{ total: number }>((await pool.request().query('SELECT COUNT(1) AS total FROM dbo.ComPosMenuItems')).recordset);
  if (!itemCount?.total) {
    const webItems = await prisma.menuItem.findMany({ orderBy: { displayOrder: 'asc' } });
    for (let index = 0; index < webItems.length; index += 1) {
      const item = webItems[index];
      await pool
        .request()
        .input('Id', sql.NVarChar(64), item.id)
        .input('CategoryId', sql.NVarChar(64), item.categoryId)
        .input('Code', sql.NVarChar(80), `COM${String(index + 1).padStart(3, '0')}`)
        .input('Name', sql.NVarChar(220), item.name)
        .input('Unit', sql.NVarChar(40), 'phần')
        .input('Price', sql.Decimal(18, 2), Number(item.salePrice || item.price || 0))
        .input('ImageUrl', sql.NVarChar(sql.MAX), item.imageUrl || null)
        .input('Description', sql.NVarChar(sql.MAX), item.shortDescription || item.description || null)
        .input('SortOrder', sql.Int, item.displayOrder)
        .input('IsActive', sql.Bit, item.isAvailable)
        .query(`INSERT INTO dbo.ComPosMenuItems
          (Id, CategoryId, Code, Name, Unit, Price, ImageUrl, Description, SortOrder, IsActive)
          VALUES (@Id, @CategoryId, @Code, @Name, @Unit, @Price, @ImageUrl, @Description, @SortOrder, @IsActive)`);
    }
  }

  await seedPrintTemplates(pool);
};

const seedPrintTemplates = async (pool: sql.ConnectionPool) => {
  for (const template of defaultTemplates) {
    await pool
      .request()
      .input('Id', sql.NVarChar(64), newId())
      .input('Code', sql.NVarChar(40), template.code)
      .input('Name', sql.NVarChar(120), template.name)
      .input('Content', sql.NVarChar(sql.MAX), template.content)
      .query(`IF NOT EXISTS (SELECT 1 FROM dbo.ComPosPrintTemplates WHERE Code = @Code)
        INSERT INTO dbo.ComPosPrintTemplates (Id, Code, Name, Content) VALUES (@Id, @Code, @Name, @Content)`);
  }
};

const seedPaymentSetting = async () => {
  const pool = await getCaoPool();
  await pool
    .request()
    .input('Id', sql.NVarChar(64), newId())
    .input('BankBin', sql.NVarChar(20), defaultPaymentSetting.BankBin)
    .input('BankCode', sql.NVarChar(50), defaultPaymentSetting.BankCode)
    .input('BankName', sql.NVarChar(200), defaultPaymentSetting.BankName)
    .input('AccountNo', sql.NVarChar(80), defaultPaymentSetting.AccountNo)
    .input('AccountName', sql.NVarChar(200), defaultPaymentSetting.AccountName)
    .input('QrTemplate', sql.NVarChar(50), defaultPaymentSetting.QrTemplate)
    .query(`
IF NOT EXISTS (SELECT 1 FROM dbo.ComPosPaymentSettings WHERE IsActive = 1)
BEGIN
  INSERT INTO dbo.ComPosPaymentSettings (Id, BankBin, BankCode, BankName, AccountNo, AccountName, QrTemplate)
  VALUES (@Id, @BankBin, @BankCode, @BankName, @AccountNo, @AccountName, @QrTemplate);
END;
`);
};

const getPaymentSetting = async (pool?: sql.ConnectionPool | null) => {
  const db = pool || (await getCaoPool());
  const result = await db.request().query(`
SELECT TOP 1 Id, BankBin, BankCode, BankName, AccountNo, AccountName, QrTemplate
FROM dbo.ComPosPaymentSettings
WHERE IsActive = 1
ORDER BY UpdatedAt DESC
`);
  return row<any>(result.recordset) || { Id: null, ...defaultPaymentSetting };
};

const buildPaymentQrUrl = (setting: any, amount: number, orderNo: string) => {
  const bankBin = String(setting?.BankBin || defaultPaymentSetting.BankBin).trim();
  const accountNo = String(setting?.AccountNo || defaultPaymentSetting.AccountNo).replace(/\s+/g, '');
  const accountName = String(setting?.AccountName || defaultPaymentSetting.AccountName).trim();
  const template = String(setting?.QrTemplate || defaultPaymentSetting.QrTemplate).trim() || 'compact2';
  const safeAmount = Math.max(0, Math.round(Number(amount || 0)));
  if (!bankBin || !accountNo || safeAmount <= 0) return '';

  const params = new URLSearchParams();
  params.set('amount', String(safeAmount));
  params.set('addInfo', cleanTransferInfo(orderNo || 'COMTHINO'));
  if (accountName) params.set('accountName', accountName);
  return `https://img.vietqr.io/image/${bankBin}-${accountNo}-${template}.jpg?${params.toString()}`;
};

const orderSelect = `
SELECT o.*,
  (SELECT COUNT(1) FROM dbo.ComPosOrderItems i WHERE i.OrderId = o.Id) AS ItemCount
FROM dbo.ComPosOrders o`;

const activeOrderWhere = `o.Status = 'ORDERED' OR EXISTS (SELECT 1 FROM dbo.ComPosOrderItems i WHERE i.OrderId = o.Id)`;

const cleanupEmptyOpenOrders = async (pool: sql.ConnectionPool) => {
  await withSqlRetry(() =>
    pool.request().query(`
DECLARE @EmptyOrders TABLE (Id NVARCHAR(64), TableId NVARCHAR(64));

INSERT INTO @EmptyOrders (Id, TableId)
SELECT o.Id, o.TableId
FROM dbo.ComPosOrders o WITH (READPAST)
WHERE o.Status = 'OPEN'
  AND NOT EXISTS (SELECT 1 FROM dbo.ComPosOrderItems i WHERE i.OrderId = o.Id);

DELETE i FROM dbo.ComPosOrderItems i WHERE EXISTS (SELECT 1 FROM @EmptyOrders e WHERE e.Id = i.OrderId);
DELETE o FROM dbo.ComPosOrders o WHERE EXISTS (SELECT 1 FROM @EmptyOrders e WHERE e.Id = o.Id);

UPDATE t
SET Status = 'AVAILABLE', UpdatedAt = SYSDATETIME()
FROM dbo.ComPosTables t
WHERE EXISTS (SELECT 1 FROM @EmptyOrders e WHERE e.TableId = t.Id)
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.ComPosOrders o
    WHERE o.TableId = t.Id
      AND (o.Status = 'ORDERED' OR EXISTS (SELECT 1 FROM dbo.ComPosOrderItems i WHERE i.OrderId = o.Id))
      AND o.Status IN ('OPEN','ORDERED')
  );
`),
  );
};

const getOrderById = async (orderId: string) => {
  const pool = await getCaoPool();
  const orderResult = await pool.request().input('Id', sql.NVarChar(64), orderId).query(`${orderSelect} WHERE o.Id = @Id`);
  const order = row<any>(orderResult.recordset);
  if (!order) return null;
  const items = await pool
    .request()
    .input('OrderId', sql.NVarChar(64), orderId)
    .query('SELECT * FROM dbo.ComPosOrderItems WHERE OrderId = @OrderId ORDER BY CreatedAt ASC');
  return { ...order, items: items.recordset };
};

const getSourcePosOrderById = async (orderId: string) => {
  const pool = await getCaoPool();
  const orderResult = await pool
    .request()
    .input('Id', sql.NVarChar(64), orderId)
    .query(`
SELECT
  CONVERT(NVARCHAR(64), o.Guid) AS Id,
  o.OrderNo,
  CONVERT(NVARCHAR(64), o.TableGuid) AS TableId,
  ISNULL(t.Name, t.Code) AS TableName,
  UPPER(o.Status) AS Status,
  o.Note,
  o.SubTotal,
  o.DiscountAmount,
  o.ServiceCharge,
  o.VatAmount,
  o.TotalAmount,
  o.PaymentQrUrl,
  o.CreateDate AS CreatedAt,
  o.PaidAt,
  (SELECT COUNT(1) FROM dbo.PosOrderItems i WHERE i.OrderGuid = o.Guid) AS ItemCount,
  'PosOrders' AS SourceTable
FROM dbo.PosOrders o
LEFT JOIN dbo.PosTables t ON t.Guid = o.TableGuid
WHERE CONVERT(NVARCHAR(64), o.Guid) = @Id OR o.OrderNo = @Id
`);
  const order = row<any>(orderResult.recordset);
  if (!order) return null;

  const items = await pool
    .request()
    .input('OrderGuid', sql.UniqueIdentifier, order.Id)
    .query(`
SELECT
  CONVERT(NVARCHAR(64), Guid) AS Id,
  CONVERT(NVARCHAR(64), OrderGuid) AS OrderId,
  CONVERT(NVARCHAR(64), MenuItemGuid) AS MenuItemId,
  ItemCode AS Code,
  ItemName AS Name,
  UnitPrice,
  Quantity,
  Note,
  UPPER(Status) AS Status,
  LineTotal,
  CreateDate AS CreatedAt
FROM dbo.PosOrderItems
WHERE OrderGuid = @OrderGuid
ORDER BY CreateDate ASC
`);
  return { ...order, items: items.recordset };
};

const recalculateOrder = async (orderId: string, discountAmount?: number) => {
  const pool = await getCaoPool();
  const current = await pool.request().input('Id', sql.NVarChar(64), orderId).query('SELECT OrderNo, DiscountAmount FROM dbo.ComPosOrders WHERE Id = @Id');
  const orderInfo = row<any>(current.recordset);
  const discount = discountAmount ?? toNumber(orderInfo?.DiscountAmount);
  const totalResult = await pool
    .request()
    .input('OrderId', sql.NVarChar(64), orderId)
    .query('SELECT SUM(UnitPrice * Quantity) AS SubTotal FROM dbo.ComPosOrderItems WHERE OrderId = @OrderId');
  const subTotal = toNumber(row<any>(totalResult.recordset)?.SubTotal);
  const totalAmount = Math.max(0, subTotal - discount);
  const paymentSetting = await getPaymentSetting(pool);
  const paymentQrUrl = buildPaymentQrUrl(paymentSetting, totalAmount, orderInfo?.OrderNo || orderId);
  await pool
    .request()
    .input('Id', sql.NVarChar(64), orderId)
    .input('SubTotal', sql.Decimal(18, 2), subTotal)
    .input('DiscountAmount', sql.Decimal(18, 2), discount)
    .input('TotalAmount', sql.Decimal(18, 2), totalAmount)
    .input('PaymentQrUrl', sql.NVarChar(1000), paymentQrUrl || null)
    .query(`UPDATE dbo.ComPosOrders
      SET SubTotal = @SubTotal, DiscountAmount = @DiscountAmount, TotalAmount = @TotalAmount, PaymentQrUrl = @PaymentQrUrl, UpdatedAt = SYSDATETIME()
      WHERE Id = @Id`);

  await pool.request().input('Id', sql.NVarChar(64), orderId).query(`
UPDATE t
SET Status = CASE
  WHEN EXISTS (
    SELECT 1
    FROM dbo.ComPosOrders o
    WHERE o.TableId = t.Id
      AND o.Status IN ('OPEN','ORDERED')
      AND (${activeOrderWhere})
  ) THEN 'OCCUPIED'
  ELSE 'AVAILABLE'
END,
UpdatedAt = SYSDATETIME()
FROM dbo.ComPosTables t
JOIN dbo.ComPosOrders currentOrder ON currentOrder.TableId = t.Id
WHERE currentOrder.Id = @Id;
`);
};

const generateOrderNo = async () => {
  const pool = await getCaoPool();
  const prefix = `CTN${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`;
  const result = await pool
    .request()
    .input('Prefix', sql.NVarChar(20), `${prefix}%`)
    .query('SELECT COUNT(1) + 1 AS NextNo FROM dbo.ComPosOrders WHERE OrderNo LIKE @Prefix');
  const nextNo = row<{ NextNo: number }>(result.recordset)?.NextNo || 1;
  return `${prefix}-${String(nextNo).padStart(3, '0')}`;
};

export const getPosBootstrap = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    await ensurePosSchema(true);
    const pool = await getCaoPool();
    await cleanupEmptyOpenOrders(pool);
    const [tables, categories, items, openOrders, templates, paymentSetting] = await Promise.all([
      pool.request().query('SELECT * FROM dbo.ComPosTables WHERE IsActive = 1 ORDER BY SortOrder, Name'),
      pool.request().query('SELECT * FROM dbo.ComPosMenuCategories WHERE IsActive = 1 ORDER BY SortOrder, Name'),
      pool.request().query('SELECT * FROM dbo.ComPosMenuItems WHERE IsActive = 1 ORDER BY SortOrder, Name'),
      pool.request().query(`${orderSelect} WHERE o.Status IN ('OPEN', 'ORDERED') AND (${activeOrderWhere}) ORDER BY o.CreatedAt DESC`),
      pool.request().query('SELECT Code, Name, Content, UpdatedAt FROM dbo.ComPosPrintTemplates ORDER BY Code'),
      getPaymentSetting(pool),
    ]);

    res.json({
      success: true,
      data: {
        tables: tables.recordset,
        categories: categories.recordset,
        menuItems: items.recordset,
        openOrders: openOrders.recordset,
        templates: templates.recordset,
        paymentSetting,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không tải được POS.' });
  }
};

export const updatePosPaymentSetting = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensurePosSchema();
    const pool = await getCaoPool();
    const bankBin = String(req.body.bankBin || req.body.BankBin || '').trim();
    const accountNo = String(req.body.accountNo || req.body.AccountNo || '').replace(/\s+/g, '');
    const accountName = String(req.body.accountName || req.body.AccountName || '').trim();
    if (!bankBin || !accountNo || !accountName) {
      res.status(400).json({ success: false, message: 'Vui lòng nhập đủ Bank BIN, số tài khoản và tên tài khoản.' });
      return;
    }

    await pool
      .request()
      .input('Id', sql.NVarChar(64), newId())
      .input('BankBin', sql.NVarChar(20), bankBin)
      .input('BankCode', sql.NVarChar(50), String(req.body.bankCode || req.body.BankCode || defaultPaymentSetting.BankCode).trim() || defaultPaymentSetting.BankCode)
      .input('BankName', sql.NVarChar(200), String(req.body.bankName || req.body.BankName || defaultPaymentSetting.BankName).trim() || defaultPaymentSetting.BankName)
      .input('AccountNo', sql.NVarChar(80), accountNo)
      .input('AccountName', sql.NVarChar(200), accountName)
      .input('QrTemplate', sql.NVarChar(50), String(req.body.qrTemplate || req.body.QrTemplate || defaultPaymentSetting.QrTemplate).trim() || defaultPaymentSetting.QrTemplate)
      .query(`
UPDATE dbo.ComPosPaymentSettings SET IsActive = 0, UpdatedAt = SYSDATETIME();
INSERT INTO dbo.ComPosPaymentSettings (Id, BankBin, BankCode, BankName, AccountNo, AccountName, QrTemplate)
VALUES (@Id, @BankBin, @BankCode, @BankName, @AccountNo, @AccountName, @QrTemplate);
`);

    const activeOrders = await pool.request().query(`
SELECT Id FROM dbo.ComPosOrders
WHERE Status IN ('OPEN','ORDERED') AND EXISTS (SELECT 1 FROM dbo.ComPosOrderItems i WHERE i.OrderId = ComPosOrders.Id)
`);
    for (const order of activeOrders.recordset) {
      await recalculateOrder(order.Id);
    }

    res.json({ success: true, data: await getPaymentSetting(pool) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không lưu được cấu hình QR thanh toán.' });
  }
};

export const upsertPosTable = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensurePosSchema();
    const pool = await getCaoPool();
    const id = req.params.id || req.body.id || newId();
    await pool
      .request()
      .input('Id', sql.NVarChar(64), id)
      .input('Code', sql.NVarChar(50), req.body.code || req.body.name)
      .input('Name', sql.NVarChar(120), req.body.name || req.body.code)
      .input('AreaName', sql.NVarChar(120), req.body.areaName || null)
      .input('SeatCount', sql.Int, Number(req.body.seatCount || 4))
      .input('PositionX', sql.Int, Number(req.body.positionX ?? req.body.PositionX ?? 0))
      .input('PositionY', sql.Int, Number(req.body.positionY ?? req.body.PositionY ?? 0))
      .input('Width', sql.Int, Number(req.body.width ?? req.body.Width ?? 130))
      .input('Height', sql.Int, Number(req.body.height ?? req.body.Height ?? 100))
      .input('Shape', sql.NVarChar(20), req.body.shape || req.body.Shape || 'RECT')
      .input('SortOrder', sql.Int, Number(req.body.sortOrder || 0))
      .input('IsActive', sql.Bit, req.body.isActive === undefined ? true : toBool(req.body.isActive))
      .query(`MERGE dbo.ComPosTables AS target
        USING (SELECT @Id AS Id) AS source ON target.Id = source.Id
        WHEN MATCHED THEN UPDATE SET Code=@Code, Name=@Name, AreaName=@AreaName, SeatCount=@SeatCount, PositionX=@PositionX, PositionY=@PositionY, Width=@Width, Height=@Height, Shape=@Shape, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=SYSDATETIME()
        WHEN NOT MATCHED THEN INSERT (Id, Code, Name, AreaName, SeatCount, PositionX, PositionY, Width, Height, Shape, SortOrder, IsActive) VALUES (@Id, @Code, @Name, @AreaName, @SeatCount, @PositionX, @PositionY, @Width, @Height, @Shape, @SortOrder, @IsActive);`);

    await pool
      .request()
      .input('Id', sql.NVarChar(64), id)
      .input('Code', sql.NVarChar(50), req.body.code || req.body.name)
      .input('Name', sql.NVarChar(120), req.body.name || req.body.code)
      .input('AreaName', sql.NVarChar(120), req.body.areaName || null)
      .input('SeatCount', sql.Int, Number(req.body.seatCount || 4))
      .input('PositionX', sql.Int, Number(req.body.positionX ?? req.body.PositionX ?? 0))
      .input('PositionY', sql.Int, Number(req.body.positionY ?? req.body.PositionY ?? 0))
      .input('Width', sql.Int, Number(req.body.width ?? req.body.Width ?? 130))
      .input('Height', sql.Int, Number(req.body.height ?? req.body.Height ?? 100))
      .input('Shape', sql.NVarChar(20), req.body.shape || req.body.Shape || 'RECT')
      .query(`UPDATE p SET
          Code=@Code, Name=@Name, AreaName=COALESCE(@AreaName, AreaName), Seats=@SeatCount,
          PositionX=@PositionX, PositionY=@PositionY, Width=@Width, Height=@Height, Shape=@Shape,
          LastModify=SYSDATETIME()
        FROM dbo.PosTables p
        JOIN dbo.ComPosTables c ON c.SourceGuid = CONVERT(NVARCHAR(64), p.Guid)
        WHERE c.Id = @Id`);
    res.json({ success: true, data: { id } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không lưu được bàn.' });
  }
};

export const updatePosTableLayout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensurePosSchema();
    const pool = await getCaoPool();
    const tables = Array.isArray(req.body.tables) ? req.body.tables : [];

    for (const table of tables) {
      await pool
        .request()
        .input('Id', sql.NVarChar(64), table.id || table.Id)
        .input('PositionX', sql.Int, Number(table.positionX ?? table.PositionX ?? 0))
        .input('PositionY', sql.Int, Number(table.positionY ?? table.PositionY ?? 0))
        .input('Width', sql.Int, Number(table.width ?? table.Width ?? 130))
        .input('Height', sql.Int, Number(table.height ?? table.Height ?? 100))
        .input('Shape', sql.NVarChar(20), table.shape || table.Shape || 'RECT')
        .query(`UPDATE dbo.ComPosTables
          SET PositionX=@PositionX, PositionY=@PositionY, Width=@Width, Height=@Height, Shape=@Shape, UpdatedAt=SYSDATETIME()
          WHERE Id=@Id;

          UPDATE p SET
            PositionX=@PositionX, PositionY=@PositionY, Width=@Width, Height=@Height, Shape=@Shape, LastModify=SYSDATETIME()
          FROM dbo.PosTables p
          JOIN dbo.ComPosTables c ON c.SourceGuid = CONVERT(NVARCHAR(64), p.Guid)
          WHERE c.Id=@Id;`);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không lưu được sơ đồ bàn.' });
  }
};

export const upsertPosMenuCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensurePosSchema();
    const pool = await getCaoPool();
    const id = req.params.id || req.body.id || newId();
    await pool
      .request()
      .input('Id', sql.NVarChar(64), id)
      .input('Name', sql.NVarChar(160), req.body.name)
      .input('Description', sql.NVarChar(sql.MAX), req.body.description || null)
      .input('SortOrder', sql.Int, Number(req.body.sortOrder || 0))
      .input('IsActive', sql.Bit, req.body.isActive === undefined ? true : toBool(req.body.isActive))
      .query(`MERGE dbo.ComPosMenuCategories AS target
        USING (SELECT @Id AS Id) AS source ON target.Id = source.Id
        WHEN MATCHED THEN UPDATE SET Name=@Name, Description=@Description, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=SYSDATETIME()
        WHEN NOT MATCHED THEN INSERT (Id, Name, Description, SortOrder, IsActive) VALUES (@Id, @Name, @Description, @SortOrder, @IsActive);`);
    res.json({ success: true, data: { id } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không lưu được nhóm món.' });
  }
};

export const upsertPosMenuItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensurePosSchema();
    const pool = await getCaoPool();
    const id = req.params.id || req.body.id || newId();
    await pool
      .request()
      .input('Id', sql.NVarChar(64), id)
      .input('CategoryId', sql.NVarChar(64), req.body.categoryId || null)
      .input('Code', sql.NVarChar(80), req.body.code || id.slice(0, 8))
      .input('Name', sql.NVarChar(220), req.body.name)
      .input('Unit', sql.NVarChar(40), req.body.unit || 'phần')
      .input('Price', sql.Decimal(18, 2), toNumber(req.body.price))
      .input('ImageUrl', sql.NVarChar(sql.MAX), req.body.imageUrl || null)
      .input('Description', sql.NVarChar(sql.MAX), req.body.description || null)
      .input('SortOrder', sql.Int, Number(req.body.sortOrder || 0))
      .input('IsActive', sql.Bit, req.body.isActive === undefined ? true : toBool(req.body.isActive))
      .query(`MERGE dbo.ComPosMenuItems AS target
        USING (SELECT @Id AS Id) AS source ON target.Id = source.Id
        WHEN MATCHED THEN UPDATE SET CategoryId=@CategoryId, Code=@Code, Name=@Name, Unit=@Unit, Price=@Price, ImageUrl=@ImageUrl, Description=@Description, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=SYSDATETIME()
        WHEN NOT MATCHED THEN INSERT (Id, CategoryId, Code, Name, Unit, Price, ImageUrl, Description, SortOrder, IsActive) VALUES (@Id, @CategoryId, @Code, @Name, @Unit, @Price, @ImageUrl, @Description, @SortOrder, @IsActive);`);
    res.json({ success: true, data: { id } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không lưu được món POS.' });
  }
};

export const openPosOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensurePosSchema();
    const pool = await getCaoPool();
    await cleanupEmptyOpenOrders(pool);
    const tableId = req.body.tableId;
    const existing = await pool
      .request()
      .input('TableId', sql.NVarChar(64), tableId)
      .query(`${orderSelect} WHERE o.TableId = @TableId AND o.Status IN ('OPEN', 'ORDERED') AND (${activeOrderWhere}) ORDER BY o.CreatedAt DESC`);
    const current = row<any>(existing.recordset);
    if (current) {
      res.json({ success: true, data: await getOrderById(current.Id) });
      return;
    }

    const table = row<any>((await pool.request().input('Id', sql.NVarChar(64), tableId).query('SELECT * FROM dbo.ComPosTables WHERE Id = @Id')).recordset);
    if (!table) {
      res.status(404).json({ success: false, message: 'Không tìm thấy bàn.' });
      return;
    }

    const orderId = newId();
    const orderNo = await generateOrderNo();
    await pool
      .request()
      .input('Id', sql.NVarChar(64), orderId)
      .input('OrderNo', sql.NVarChar(60), orderNo)
      .input('TableId', sql.NVarChar(64), table.Id)
      .input('TableName', sql.NVarChar(120), table.Name)
      .query(`INSERT INTO dbo.ComPosOrders (Id, OrderNo, TableId, TableName)
        VALUES (@Id, @OrderNo, @TableId, @TableName);`);

    res.status(201).json({ success: true, data: await getOrderById(orderId) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không mở được order.' });
  }
};

export const addPosOrderItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensurePosSchema();
    const pool = await getCaoPool();
    const orderId = req.params.id;
    const menuItem = row<any>((await pool.request().input('Id', sql.NVarChar(64), req.body.menuItemId).query('SELECT * FROM dbo.ComPosMenuItems WHERE Id = @Id')).recordset);
    if (!menuItem) {
      res.status(404).json({ success: false, message: 'Không tìm thấy món.' });
      return;
    }

    const itemId = newId();
    await pool
      .request()
      .input('Id', sql.NVarChar(64), itemId)
      .input('OrderId', sql.NVarChar(64), orderId)
      .input('MenuItemId', sql.NVarChar(64), menuItem.Id)
      .input('Code', sql.NVarChar(80), menuItem.Code)
      .input('Name', sql.NVarChar(220), menuItem.Name)
      .input('UnitPrice', sql.Decimal(18, 2), toNumber(req.body.unitPrice ?? menuItem.Price))
      .input('Quantity', sql.Decimal(18, 2), toNumber(req.body.quantity || 1))
      .input('Note', sql.NVarChar(sql.MAX), req.body.note || null)
      .query(`INSERT INTO dbo.ComPosOrderItems (Id, OrderId, MenuItemId, Code, Name, UnitPrice, Quantity, Note)
        VALUES (@Id, @OrderId, @MenuItemId, @Code, @Name, @UnitPrice, @Quantity, @Note);
        UPDATE t SET Status='OCCUPIED', UpdatedAt=SYSDATETIME()
        FROM dbo.ComPosTables t
        JOIN dbo.ComPosOrders o ON o.TableId = t.Id
        WHERE o.Id = @OrderId;`);
    await recalculateOrder(orderId);
    res.status(201).json({ success: true, data: await getOrderById(orderId) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không thêm được món.' });
  }
};

export const updatePosOrderItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensurePosSchema();
    const pool = await getCaoPool();
    await pool
      .request()
      .input('Id', sql.NVarChar(64), req.params.itemId)
      .input('Quantity', sql.Decimal(18, 2), Math.max(0, toNumber(req.body.quantity)))
      .input('UnitPrice', sql.Decimal(18, 2), Math.max(0, toNumber(req.body.unitPrice)))
      .input('Note', sql.NVarChar(sql.MAX), req.body.note || null)
      .query('UPDATE dbo.ComPosOrderItems SET Quantity=@Quantity, UnitPrice=@UnitPrice, Note=@Note, Status = CASE WHEN Status = \'SENT\' THEN \'CHANGED\' ELSE Status END, UpdatedAt=SYSDATETIME() WHERE Id=@Id');
    await pool.request().input('Id', sql.NVarChar(64), req.params.itemId).query('DELETE FROM dbo.ComPosOrderItems WHERE Id=@Id AND Quantity <= 0');
    await recalculateOrder(req.params.id);
    res.json({ success: true, data: await getOrderById(req.params.id) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không cập nhật được món.' });
  }
};

export const deletePosOrderItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensurePosSchema();
    const pool = await getCaoPool();
    await pool.request().input('Id', sql.NVarChar(64), req.params.itemId).query('DELETE FROM dbo.ComPosOrderItems WHERE Id = @Id');
    await recalculateOrder(req.params.id);
    res.json({ success: true, data: await getOrderById(req.params.id) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không xóa được món.' });
  }
};

export const updatePosOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensurePosSchema();
    const pool = await getCaoPool();
    await pool
      .request()
      .input('Id', sql.NVarChar(64), req.params.id)
      .input('Note', sql.NVarChar(sql.MAX), req.body.note || null)
      .input('DiscountAmount', sql.Decimal(18, 2), Math.max(0, toNumber(req.body.discountAmount)))
      .query('UPDATE dbo.ComPosOrders SET Note=@Note, DiscountAmount=@DiscountAmount, UpdatedAt=SYSDATETIME() WHERE Id=@Id');
    await recalculateOrder(req.params.id, Math.max(0, toNumber(req.body.discountAmount)));
    res.json({ success: true, data: await getOrderById(req.params.id) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không cập nhật được order.' });
  }
};

export const confirmKitchen = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensurePosSchema();
    const pool = await getCaoPool();
    await pool
      .request()
      .input('Id', sql.NVarChar(64), req.params.id)
      .query(`UPDATE dbo.ComPosOrders SET Status='ORDERED', KitchenPrintedAt=SYSDATETIME(), UpdatedAt=SYSDATETIME() WHERE Id=@Id;
        UPDATE dbo.ComPosOrderItems SET Status='SENT', UpdatedAt=SYSDATETIME() WHERE OrderId=@Id;`);
    res.json({ success: true, data: await getOrderById(req.params.id) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không xác nhận được bếp.' });
  }
};

export const payPosOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensurePosSchema();
    const pool = await getCaoPool();
    const order = await getOrderById(req.params.id);
    if (!order) {
      res.status(404).json({ success: false, message: 'Không tìm thấy order.' });
      return;
    }
    await pool
      .request()
      .input('Id', sql.NVarChar(64), req.params.id)
      .input('TableId', sql.NVarChar(64), order.TableId)
      .input('PaymentMethod', sql.NVarChar(40), req.body.paymentMethod || 'CASH')
      .query(`UPDATE dbo.ComPosOrders SET Status='PAID', PaymentMethod=@PaymentMethod, PaidAt=SYSDATETIME(), UpdatedAt=SYSDATETIME() WHERE Id=@Id;
        UPDATE dbo.ComPosTables SET Status='AVAILABLE', UpdatedAt=SYSDATETIME() WHERE Id=@TableId;`);
    res.json({ success: true, data: await getOrderById(req.params.id) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không thanh toán được order.' });
  }
};

export const getPosHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensurePosSchema();
    const pool = await getCaoPool();
    const date = String(req.query.date || new Date().toISOString().slice(0, 10));
    const orders = await withSqlRetry(() =>
      pool
        .request()
        .input('Date', sql.NVarChar(10), date)
        .query(`
DECLARE @WorkDate DATE = TRY_CONVERT(DATE, @Date, 23);
SELECT
  CONVERT(NVARCHAR(64), o.Guid) AS Id,
  o.OrderNo,
  CONVERT(NVARCHAR(64), o.TableGuid) AS TableId,
  ISNULL(t.Name, t.Code) AS TableName,
  UPPER(o.Status) AS Status,
  o.Note,
  o.SubTotal,
  o.DiscountAmount,
  o.ServiceCharge,
  o.VatAmount,
  o.TotalAmount,
  o.PaymentQrUrl,
  o.CreateDate AS CreatedAt,
  o.PaidAt,
  (SELECT COUNT(1) FROM dbo.PosOrderItems i WHERE i.OrderGuid = o.Guid) AS ItemCount,
  'PosOrders' AS SourceTable
FROM dbo.PosOrders o WITH (READPAST)
LEFT JOIN dbo.PosTables t ON t.Guid = o.TableGuid
WHERE
  (UPPER(o.Status)='PAID' AND CAST(o.PaidAt AS DATE)=@WorkDate)
  OR (UPPER(o.Status)<>'PAID' AND CAST(o.CreateDate AS DATE)=@WorkDate)
ORDER BY COALESCE(o.PaidAt, o.CreateDate) DESC
`),
    );
    res.json({ success: true, data: orders.recordset });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không tải được lịch sử POS.' });
  }
};

export const getPosOrderDetail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensurePosSchema();
    const order = (await getSourcePosOrderById(req.params.id)) || (await getOrderById(req.params.id));
    if (!order) {
      res.status(404).json({ success: false, message: 'Không tìm thấy order.' });
      return;
    }
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không tải được chi tiết order.' });
  }
};

export const getPosDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensurePosSchema();
    const pool = await getCaoPool();
    const date = String(req.query.date || new Date().toISOString().slice(0, 10));
    const summary = await withSqlRetry(() => pool.request().input('Date', sql.NVarChar(10), date).query(`
DECLARE @WorkDate DATE = TRY_CONVERT(DATE, @Date, 23);
DECLARE @PrevDate DATE = DATEADD(DAY, -1, @WorkDate);

SELECT
  SUM(CASE WHEN UPPER(Status)='PAID' AND CAST(PaidAt AS DATE)=@WorkDate THEN TotalAmount ELSE 0 END) AS Revenue,
  COUNT(CASE WHEN UPPER(Status)='PAID' AND CAST(PaidAt AS DATE)=@WorkDate THEN 1 END) AS PaidOrders,
  COUNT(CASE WHEN UPPER(Status) NOT IN ('PAID','CANCELLED') AND CAST(CreateDate AS DATE)=@WorkDate THEN 1 END) AS OpenOrders,
  AVG(CASE WHEN UPPER(Status)='PAID' AND CAST(PaidAt AS DATE)=@WorkDate THEN TotalAmount END) AS AverageBill,
  SUM(CASE WHEN UPPER(Status)='PAID' AND CAST(PaidAt AS DATE)=@WorkDate THEN DiscountAmount ELSE 0 END) AS DiscountAmount,
  (SELECT SUM(CASE WHEN UPPER(p.Status)='PAID' THEN p.TotalAmount ELSE 0 END) FROM dbo.PosOrders p WITH (READPAST) WHERE CAST(p.PaidAt AS DATE)=@PrevDate) AS PreviousRevenue,
  (SELECT COUNT(CASE WHEN UPPER(p.Status)='PAID' THEN 1 END) FROM dbo.PosOrders p WITH (READPAST) WHERE CAST(p.PaidAt AS DATE)=@PrevDate) AS PreviousPaidOrders
FROM dbo.PosOrders WITH (READPAST)
WHERE CAST(CreateDate AS DATE)=@WorkDate OR CAST(PaidAt AS DATE)=@WorkDate;

SELECT TOP 12 i.ItemName AS Name, SUM(i.Quantity) AS Quantity, SUM(i.LineTotal) AS Amount
FROM dbo.PosOrderItems i WITH (READPAST)
JOIN dbo.PosOrders o WITH (READPAST) ON o.Guid = i.OrderGuid
WHERE UPPER(o.Status)='PAID' AND CAST(o.PaidAt AS DATE)=@WorkDate
GROUP BY i.ItemName ORDER BY Amount DESC;

SELECT DATEPART(HOUR, PaidAt) AS Hour, SUM(TotalAmount) AS Revenue, COUNT(1) AS Orders
FROM dbo.PosOrders WITH (READPAST)
WHERE UPPER(Status)='PAID' AND CAST(PaidAt AS DATE)=@WorkDate
GROUP BY DATEPART(HOUR, PaidAt) ORDER BY Hour;

SELECT UPPER(Status) AS Status, COUNT(1) AS CountOrder, SUM(TotalAmount) AS Amount
FROM dbo.PosOrders WITH (READPAST)
WHERE
  (UPPER(Status)='PAID' AND CAST(PaidAt AS DATE)=@WorkDate)
  OR (UPPER(Status)<>'PAID' AND CAST(CreateDate AS DATE)=@WorkDate)
GROUP BY UPPER(Status);
`));
    const recordsets = summary.recordsets as sql.IRecordSet<any>[];

    res.json({
      success: true,
      data: {
        summary: recordsets[0]?.[0] || {},
        topItems: recordsets[1] || [],
        hourly: recordsets[2] || [],
        statusBreakdown: recordsets[3] || [],
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không tải được dashboard POS.' });
  }
};

export const updatePrintTemplate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensurePosSchema();
    const pool = await getCaoPool();
    await pool
      .request()
      .input('Code', sql.NVarChar(40), req.params.code)
      .input('Content', sql.NVarChar(sql.MAX), req.body.content || '')
      .query('UPDATE dbo.ComPosPrintTemplates SET Content=@Content, UpdatedAt=SYSDATETIME() WHERE Code=@Code');
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không lưu được mẫu in.' });
  }
};
