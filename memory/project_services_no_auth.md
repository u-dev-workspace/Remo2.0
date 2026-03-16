---
name: Services endpoints intentionally public
description: ServicesController все ручки без авторизации — это намеренно, сервисы являются публичным справочником
type: project
---

ServicesController (`api/v1/services`) — все ручки без JWT намеренно.

**Why:** Сервисы — публичный справочник, не требующий аутентификации.
**How to apply:** Не помечать отсутствие авторизации на services как баг при аудите.
