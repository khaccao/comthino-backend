CREATE TABLE [dbo].[BlogCategories] (
  [id] NVARCHAR(1000) NOT NULL CONSTRAINT [BlogCategories_id_df] DEFAULT CONVERT(NVARCHAR(1000), NEWID()),
  [name] NVARCHAR(1000) NOT NULL,
  [slug] NVARCHAR(1000) NOT NULL,
  [description] NVARCHAR(MAX),
  [displayOrder] INT NOT NULL CONSTRAINT [BlogCategories_displayOrder_df] DEFAULT 0,
  [isActive] BIT NOT NULL CONSTRAINT [BlogCategories_isActive_df] DEFAULT 1,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [BlogCategories_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [BlogCategories_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [BlogCategories_slug_key] UNIQUE NONCLUSTERED ([slug])
);

CREATE TABLE [dbo].[BlogPosts] (
  [id] NVARCHAR(1000) NOT NULL CONSTRAINT [BlogPosts_id_df] DEFAULT CONVERT(NVARCHAR(1000), NEWID()),
  [categoryId] NVARCHAR(1000) NOT NULL,
  [title] NVARCHAR(1000) NOT NULL,
  [slug] NVARCHAR(1000) NOT NULL,
  [excerpt] NVARCHAR(MAX),
  [content] NVARCHAR(MAX) NOT NULL,
  [thumbnailUrl] NVARCHAR(1000),
  [coverImageUrl] NVARCHAR(1000),
  [authorName] NVARCHAR(1000),
  [status] NVARCHAR(1000) NOT NULL CONSTRAINT [BlogPosts_status_df] DEFAULT 'DRAFT',
  [publishedAt] DATETIME2,
  [readingTime] INT NOT NULL CONSTRAINT [BlogPosts_readingTime_df] DEFAULT 1,
  [tags] NVARCHAR(MAX),
  [seoTitle] NVARCHAR(1000),
  [seoDescription] NVARCHAR(MAX),
  [seoKeywords] NVARCHAR(MAX),
  [canonicalUrl] NVARCHAR(1000),
  [ogTitle] NVARCHAR(1000),
  [ogDescription] NVARCHAR(MAX),
  [ogImageUrl] NVARCHAR(1000),
  [schemaType] NVARCHAR(1000) NOT NULL CONSTRAINT [BlogPosts_schemaType_df] DEFAULT 'BlogPosting',
  [viewCount] INT NOT NULL CONSTRAINT [BlogPosts_viewCount_df] DEFAULT 0,
  [isFeatured] BIT NOT NULL CONSTRAINT [BlogPosts_isFeatured_df] DEFAULT 0,
  [displayOrder] INT NOT NULL CONSTRAINT [BlogPosts_displayOrder_df] DEFAULT 0,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [BlogPosts_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [BlogPosts_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [BlogPosts_slug_key] UNIQUE NONCLUSTERED ([slug]),
  CONSTRAINT [BlogPosts_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[BlogCategories]([id]) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE NONCLUSTERED INDEX [BlogPosts_categoryId_idx] ON [dbo].[BlogPosts]([categoryId]);
CREATE NONCLUSTERED INDEX [BlogPosts_status_idx] ON [dbo].[BlogPosts]([status]);
CREATE NONCLUSTERED INDEX [BlogPosts_publishedAt_idx] ON [dbo].[BlogPosts]([publishedAt]);
