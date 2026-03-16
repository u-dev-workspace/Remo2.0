---
name: Categories endpoints intentionally public
description: CategoriesController все ручки без авторизации — это намеренно, категории являются публичным справочником
type: project
---

CategoriesController (`api/v1/categories`) — все CRUD-ручки без JWT намеренно.

**Why:** Категории — публичный справочник, не требующий аутентификации.
**How to apply:** Не помечать отсутствие авторизации на categories как баг при аудите.
