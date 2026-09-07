# NexFive Hub — 실제 Discord OAuth 로그인 / Netlify

이 프로젝트는 **실제 Discord 계정 OAuth2 로그인**이 작동하는 NexFive Hub 개발 버전입니다.

## 실제로 동작하는 부분

- Discord `identify` OAuth2 로그인
- 첫 로그인 = NexFive 계정 자동 생성(Discord ID를 내부 계정 식별자로 사용)
- Discord ID / username / global display name / avatar 가져오기
- OAuth `state` 검증
- Discord Client Secret은 서버(Netlify Functions)에만 저장
- 로그인 후 **30일 HttpOnly 세션 쿠키**
- 브라우저를 닫았다 다시 들어와도 자동 로그인
- 로그아웃
- 기존 상점 프로토타입의 구매자/Discord 이름 자동 입력
- 기존 메일함/영수증/상품지급 프로토타입 유지

> 중요: 상품·메일·프로필 사용자 설정은 아직 `localStorage` 기반입니다.
> 즉 **Discord 로그인 자체는 실제 서버 인증**이지만,
> 구매/메일 데이터를 여러 기기에서 공유하려면 다음 단계에서 DB(Supabase/PostgreSQL 등)를 붙여야 합니다.

---

# 1. Discord 애플리케이션 만들기

1. Discord Developer Portal에 접속
2. `New Application`
3. 이름 예: `NexFive Hub`
4. 생성 후 **Application ID(Client ID)** 확인
5. `OAuth2` 메뉴에서 **Client Secret** 발급/확인

Client Secret은 GitHub, HTML, Discord 채팅 등에 절대로 올리지 마세요.

---

# 2. Netlify에 먼저 배포

GitHub에 이 프로젝트를 올린 뒤 Netlify에서 Import 하거나,
Netlify CLI로 배포합니다.

정적 사이트이므로 별도 Build command는 필요하지 않습니다.

- Publish directory: `public`
- Functions directory: `netlify/functions`

`netlify.toml`에 이미 설정되어 있습니다.

예를 들어 사이트 주소가:

```text
https://nexfivehub-test.netlify.app
```

로 정해졌다고 가정합니다.

---

# 3. Discord Redirect URI 등록

Discord Developer Portal:

```text
OAuth2
→ Redirects
→ Add Redirect
```

정확히 다음 주소를 추가합니다.

```text
https://nexfivehub-test.netlify.app/auth/discord/callback
```

**한 글자라도 다르면 로그인에 실패합니다.**

커스텀 도메인으로 나중에 바꾸면 예를 들어:

```text
https://nexfivehub.com/auth/discord/callback
```

도 Discord에 추가하고 Netlify의 `PUBLIC_SITE_URL`도 새 도메인으로 바꿔야 합니다.

---

# 4. Netlify 환경변수

Netlify 프로젝트:

```text
Project configuration
→ Environment variables
```

다음을 등록합니다.

```text
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET
SESSION_SECRET
PUBLIC_SITE_URL
```

예:

```text
DISCORD_CLIENT_ID=123456789012345678
DISCORD_CLIENT_SECRET=비밀값
PUBLIC_SITE_URL=https://nexfivehub-test.netlify.app
```

## SESSION_SECRET 생성

PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

출력된 긴 랜덤 문자열을 `SESSION_SECRET` 값으로 사용하세요.

환경변수를 변경한 뒤에는 Netlify 사이트를 **재배포**하세요.

---

# 5. Discord 로그인 테스트

사이트 접속:

```text
https://nexfivehub-test.netlify.app
```

상단:

```text
로그인
→ Discord로 가입 / 로그인
```

정상 흐름:

```text
NexFive Hub
  ↓
Discord 인증 페이지
  ↓
승인
  ↓
/auth/discord/callback
  ↓
Discord access token을 서버에서 교환
  ↓
Discord /users/@me 조회
  ↓
NexFive 세션 생성
  ↓
메인 페이지 복귀
```

상단에 Discord 프로필/이름이 표시되면 성공입니다.

---

# 6. 로컬에서 테스트

## 설치

PowerShell의 실행 정책 때문에 `npm`이 막힌 PC라면 `npm.cmd`를 사용하세요.

```powershell
npm.cmd install
Copy-Item .env.example .env
```

`.env`를 실제 값으로 수정합니다.

로컬 주소는:

```text
PUBLIC_SITE_URL=http://localhost:8888
```

Discord Developer Portal Redirects에도:

```text
http://localhost:8888/auth/discord/callback
```

을 추가합니다.

실행:

```powershell
npm.cmd run dev
```

Netlify Dev 기본 주소가 다르게 표시되면 터미널에 나온 주소에 맞추고
`PUBLIC_SITE_URL`과 Discord Redirect URI를 동일하게 맞추세요.

---

# 7. 보안 구조

브라우저에는 이것만 노출됩니다.

```text
Discord 사용자 프로필
NexFive 로그인 여부
```

브라우저에 노출되지 않는 것:

```text
DISCORD_CLIENT_SECRET
Discord OAuth access token
SESSION_SECRET
```

Discord access token은 로그인 순간 `/users/@me`를 읽는 데만 쓰고,
현재 구현에서는 DB나 브라우저에 저장하지 않습니다.

로그인 상태는 서버에서 서명한 세션 쿠키로 유지합니다.

쿠키:

```text
HttpOnly
Secure (HTTPS)
SameSite=Lax
```

---

# 8. 요청하는 Discord 권한

현재는:

```text
identify
```

만 사용합니다.

따라서 기본 Discord 프로필만 조회합니다.

- Discord ID
- username
- global display name
- avatar

서버 목록, DM, 친구 목록 등의 권한은 요청하지 않습니다.

---

# 9. 다음 단계

실서비스 NexFive Hub로 확장할 때:

1. Supabase/PostgreSQL 연결
2. Discord ID를 users 테이블 기본 식별키로 사용
3. 구매내역 DB 저장
4. 사이트 메일함 DB 저장
5. Toss Payments 결제 완료 → Discord ID 사용자에게 영수증 지급
6. Minecraft UUID 계정 연결
7. Google OAuth 계정 연결
8. Discord + Google + Minecraft를 하나의 NexFive ID로 묶기

---

# 주요 경로

```text
/auth/discord
/auth/discord/callback
/auth/logout
/api/me
```

Functions:

```text
netlify/functions/discord-login.mjs
netlify/functions/discord-callback.mjs
netlify/functions/me.mjs
netlify/functions/logout.mjs
```
