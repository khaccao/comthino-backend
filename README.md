# ComThiNo Backend

Backend API for Com Thi No website.

## Blog module

The blog/news module is fully managed from admin. Public pages read content from the API; posts are not hardcoded in the frontend.

### Admin API

- `GET /api/admin/blog/categories`
- `POST /api/admin/blog/categories`
- `PUT /api/admin/blog/categories/:id`
- `DELETE /api/admin/blog/categories/:id`
- `GET /api/admin/blog/posts`
- `GET /api/admin/blog/posts/:id`
- `POST /api/admin/blog/posts`
- `PUT /api/admin/blog/posts/:id`
- `DELETE /api/admin/blog/posts/:id`
- `POST /api/admin/blog/posts/:id/publish`
- `POST /api/admin/blog/posts/:id/unpublish`

### Public API

- `GET /api/public/blog/categories`
- `GET /api/public/blog/posts`
- `GET /api/public/blog/posts/featured`
- `GET /api/public/blog/posts/:slug`
- `GET /api/public/blog/posts/category/:slug`
- `GET /api/public/sitemap.xml`
- `GET /api/public/robots.txt`

### SEO

Published blog posts are included in the dynamic sitemap. Frontend nginx proxies root `/sitemap.xml` and `/robots.txt` to the backend.

Each post supports SEO title, description, keywords, canonical URL, Open Graph fields, Twitter card fields and JSON-LD data on the public detail page.

## Local commands

```bash
npm install
npm run prisma:generate
npm run build
npm run prisma:seed
```

## Docker deploy

On the server:

```bash
cd /root/apps/comthino-backend
git pull --ff-only
docker compose --profile setup build --pull --no-cache backend setup-db frontend
docker compose --profile setup run --rm setup-db
docker compose up -d --remove-orphans
```
