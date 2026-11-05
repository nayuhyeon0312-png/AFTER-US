# 환승연애 시뮬레이션 v2

## 먼저 확인해 주세요
이 ZIP에는 빈 파일이 아니라 실제 코드가 들어 있습니다. 압축을 풀면 아래 파일들이 보여야 합니다.

- `index.html`
- `package.json`
- `vite.config.js`
- `server.js`
- `src/main.js`
- `src/style.css`
- `supabase/setup.sql`
- `.env.example`

## Supabase 새로 연결하기
1. https://supabase.com 에서 로그인하고 **New project**를 눌러 새 프로젝트를 만듭니다.
2. 프로젝트가 생성되면 왼쪽 **SQL Editor** → **New query**로 이동합니다.
3. 이 압축 파일 안의 `supabase/setup.sql`을 열고 전체 내용을 복사해 SQL Editor에 붙여넣은 뒤 **Run**을 누릅니다.
4. **Project Settings → API**에서 Project URL과 anon/public 키를 복사합니다.
5. Render 서비스의 Environment 메뉴에 아래 값을 등록합니다.

## Render 환경변수
각 항목을 하나씩 추가합니다.

- `VITE_SUPABASE_URL` = Supabase Project URL
- `VITE_SUPABASE_ANON_KEY` = Supabase anon/public key
- `SUPABASE_URL` = Supabase Project URL
- `SUPABASE_ANON_KEY` = Supabase anon/public key
- `OPENAI_API_KEY` = OpenAI API 키 (AI 대화를 사용하려면 필요)
- `OPENAI_MODEL` = `gpt-4.1-mini`

`service_role` 또는 `secret` 키를 프런트엔드 환경변수에 넣거나 GitHub에 올리지 마세요.

## GitHub와 Render
1. ZIP 압축을 풉니다.
2. 안의 파일과 폴더를 기존 GitHub 저장소 최상위(root)에 업로드합니다. `src`와 `supabase` 폴더도 그대로 올립니다.
3. Render의 기존 Web Service가 이 저장소를 연결하고 있는지 확인합니다.
4. Build Command: `npm install && npm run build`
5. Start Command: `npm start`
6. 환경변수를 저장한 뒤 Manual Deploy → Deploy latest commit을 누릅니다.

## 현재 버전 기능과 한계
포함 기능: 새 방 생성, 초대 코드 참가, 기본 AI 출연진 생성, 단체 채팅, AI 응답 API, 출연진 목록, 날짜 진행, 랜덤 데이트 미션, 익명 편지, 기기 내 임시 저장, Supabase 저장 및 Realtime 구독.

아직 완성되지 않은 확장 기능: 실제 참가자 2~4명 인원 설정 UI, 참가자별 X 커플링 편집과 비공개 공개 이벤트, 캐릭터별 장기 기억 요약, 1:1 개별 채팅방, 호감도/문자 선택/최종 선택과 다중 엔딩. 이 버전은 전체 프로젝트의 실행 가능한 기초 버전입니다.

## 보안 안내
현재 SQL은 개발 테스트를 쉽게 하기 위한 공개 정책을 사용합니다. 초대코드를 아는 사람이 데이터에 접근할 수 있으므로 민감한 정보를 입력하지 마세요. 외부 공개 전에는 Supabase Auth와 방 멤버 권한 검증을 구현해야 합니다.
