# NexFive Hub · Toss Payments + Netlify

이 버전은 기존 브라우저 결제 처리 대신 **토스페이먼츠 실제 결제 요청 → Netlify 서버 승인 → 서버측 Discord Webhook** 구조로 바꾼 프로토타입입니다.

## Netlify 환경변수

필수:
- `TOSS_CLIENT_KEY` — 토스 클라이언트 키
- `TOSS_SECRET_KEY` — 토스 시크릿 키
- `DISCORD_WEBHOOK_ENABLED` — `true` 또는 `false`
- `DISCORD_WEBHOOK_URL` — Discord Webhook URL
- 기존 OAuth를 사용한다면 `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`, `PUBLIC_SITE_URL`도 그대로 설정

선택(권장):
- `NEXFIVE_PRODUCT_CATALOG_JSON` — 서버가 상품 가격/이름을 검증하도록 하는 JSON 카탈로그

## 결제 흐름

1. 사용자가 상품에서 `토스페이먼츠로 결제하기`를 누릅니다.
2. `/create-toss-order` Netlify Function이 주문번호를 만들고 Netlify Blobs에 주문을 저장합니다.
3. 브라우저는 Toss Payments SDK v2의 결제창을 호출합니다.
4. 결제 성공 후 `/?payment=success`로 돌아옵니다.
5. `/confirm-toss-payment` Netlify Function이 Toss `POST /v1/payments/confirm`을 호출합니다.
6. 서버가 주문 금액과 승인 금액을 다시 비교합니다.
7. 승인 완료 후 Discord Webhook을 서버에서 전송합니다.

## 중요한 보안 사항

- Toss 시크릿 키는 절대로 HTML/JS에 넣지 않습니다.
- Discord Webhook URL은 절대로 localStorage나 프론트엔드에 저장하지 않습니다.
- 테스트 키는 실제 돈이 빠져나가지 않는 테스트 환경입니다. 운영 전환 시 같은 키 쌍의 라이브 키로 교체해야 합니다.
- 현재 상품 관리 UI 자체는 기존 프로토타입처럼 localStorage 기반입니다. 따라서 완전한 운영 보안을 위해서는 `NEXFIVE_PRODUCT_CATALOG_JSON` 또는 이후 DB/서버 상품 API로 상품 가격을 서버에서 관리해야 합니다.
- `NEXFIVE_PRODUCT_CATALOG_JSON`이 설정되면 서버는 브라우저가 보낸 상품명/가격을 서버 카탈로그와 비교하고 불일치하면 주문을 거절합니다.

## 참고
토스페이먼츠 결제 요청/승인 구조는 공식 SDK v2 및 Core API의 `POST /v1/payments/confirm` 흐름을 기준으로 합니다.
