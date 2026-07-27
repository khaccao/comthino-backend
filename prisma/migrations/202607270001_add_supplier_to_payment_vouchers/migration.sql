ALTER TABLE [dbo].[PaymentVouchers] ADD [supplierId] NVARCHAR(1000);

ALTER TABLE [dbo].[PaymentVouchers]
ADD CONSTRAINT [PaymentVouchers_supplierId_fkey]
FOREIGN KEY ([supplierId]) REFERENCES [dbo].[Suppliers]([id])
ON DELETE NO ACTION ON UPDATE NO ACTION;
