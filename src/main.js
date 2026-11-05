import { createClient } from "@supabase/supabase-js";
import "./style.css";

const SB_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY) : null;

const app = document.querySelector("#app");
const PLAYER_KEY = "afterlove_player_id";
const ROOM_KEY = "afterlove_last_room";
const DRAFT_KEY = "afterlove_local_save";
let playerId = localStorage.getItem(PLAYER_KEY);
if (!playerId) {
  playerId = crypto.randomUUID();
  localStorage.setItem(PLAYER_KEY, playerId);
}
let room = null;
let players = [];
let messages = [];
let channel = null;
let activeTab = "chat";
let sending = false;

const $ = selector => document.querySelector(selector);
const makeId = () => crypto.randomUUID();
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[char]));

function notify(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.append(node);
  setTimeout(() => node.remove(), 2600);
}

function saveLocal() {
  if (room) localStorage.setItem(DRAFT_KEY, JSON.stringify({ room, players, messages }));
}

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); }
  catch { return null; }
}

function page(content) {
  app.innerHTML = `<header class="top"><div class="brand">AFTER LOVE · 다시, 우리</div><div class="muted">연애 리얼리티 시뮬레이션</div></header>${content}<footer>모든 인물과 이야기는 가상의 시뮬레이션입니다.</footer>`;
}

function databaseStatus() {
  return supabase
    ? `<div class="notice">Supabase 연결 설정이 감지됐어요. 온라인 저장을 사용할 수 있습니다.</div>`
    : `<div class="notice">Supabase 연결 전입니다. 먼저 이 기기에서 임시 저장으로 체험할 수 있어요. 온라인 방 기능은 Supabase 설정 후 이용할 수 있습니다.</div>`;
}

function home() {
  page(`<section class="hero"><div class="eyebrow">A LOVE STORY, REWRITTEN</div><h1>우리, 다시 사랑할 수 있을까?</h1><p>끝난 사랑과 시작되는 마음 사이,<br>당신의 선택으로 새로운 이야기가 펼쳐집니다.</p></section>
  <section class="panel"><h2>새로운 이야기 시작하기</h2><div class="grid">
  <div><div class="field"><label>내 이름 / 닉네임</label><input id="nickname" maxlength="12" placeholder="예: 유현" value="${escapeHtml(localStorage.getItem("afterlove_nickname") || "")}"></div>
  <div class="field"><label>방 제목</label><input id="roomTitle" maxlength="30" value="우리의 첫 번째 계절"></div><button id="createRoom">새로운 방 만들기</button></div>
  <div><h3>초대 코드로 참여하기</h3><div class="field"><label>방 코드</label><input id="joinCode" maxlength="8" placeholder="초대 코드를 입력해 줘"></div><button class="secondary" id="joinRoom">기존 방 참여하기</button></div></div>
  <div style="margin-top:16px">${databaseStatus()}</div><div class="actions"><button class="soft" id="resume" ${localStorage.getItem(ROOM_KEY) || loadLocal() ? "" : "disabled"}>이전 게임 이어하기</button></div></section>
  <section class="panel"><h3>이야기 진행</h3><div class="grid"><div><span class="stat">01</span><p><b>입주와 첫 만남</b><br><span class="muted">참가자 소개와 첫인상</span></p></div><div><span class="stat">02</span><p><b>마음의 변화</b><br><span class="muted">채팅, 데이트, 비밀 미션</span></p></div><div><span class="stat">03</span><p><b>선택의 순간</b><br><span class="muted">문자와 최종 선택</span></p></div></div></section>`);
  $("#createRoom").onclick = createRoom;
  $("#joinRoom").onclick = () => joinRoom($("#joinCode").value.trim().toUpperCase());
  $("#resume").onclick = resumeGame;
}

function getNickname() {
  const value = ($("#nickname")?.value || localStorage.getItem("afterlove_nickname") || "나").trim();
  localStorage.setItem("afterlove_nickname", value || "나");
  return value || "나";
}

const characterSeeds = [
  { name:"서하", gender:"여성", age:25, job:"브랜드 마케터", personality:"차분하고 배려심 깊지만 마음을 표현하는 데 서툴다.", speech:"말보다 행동으로 마음을 보여주는 편이다." },
  { name:"도윤", gender:"남성", age:27, job:"사진작가", personality:"솔직하고 장난기가 많지만 중요한 순간에는 진지하다.", speech:"상대의 반응을 세심하게 살핀다." },
  { name:"지민", gender:"여성", age:26, job:"대학원생", personality:"독립적이고 당당하다. 상처받으면 혼자 정리하려 한다.", speech:"감정에 솔직하고 후회하는 걸 싫어한다." },
  { name:"태오", gender:"남성", age:28, job:"개발자", personality:"다정하고 사교적이지만 속마음은 쉽게 보여주지 않는다.", speech:"분위기를 잘 읽고 갈등을 피하려 한다." },
  { name:"수빈", gender:"여성", age:24, job:"플로리스트", personality:"엉뚱하고 밝지만 연애에서는 생각이 많다.", speech:"상대가 먼저 다가와 주길 기다리는 편이다." },
  { name:"현우", gender:"남성", age:29, job:"셰프", personality:"무뚝뚝해 보여도 정이 많고 책임감이 강하다.", speech:"천천히 마음을 열고 한 번 정하면 오래 간다." }
];

function createAI(index, roomId) {
  const seed = characterSeeds[index % characterSeeds.length];
  return {
    id: makeId(), room_id: roomId, name: seed.name, kind:"ai",
    gender:seed.gender, age:seed.age, job:seed.job,
    personality:seed.personality, speech:seed.speech,
    x_name:"", secret:"아직 공개되지 않은 과거의 감정이 있다.",
    current_feeling:"새로운 관계와 과거 사이에서 고민 중", memory:[]
  };
}

async function createRoom() {
  const nickname = getNickname();
  const title = ($("#roomTitle").value || "우리의 첫 번째 계절").trim();
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const roomId = makeId();
  room = {
    id:roomId, code, title, phase:"입주 첫날", day:1,
    state:{ storyLog:["새로운 입주자들이 한 집에 모였습니다."], createdBy:playerId }
  };
  players = [{
    id:playerId, room_id:roomId, name:nickname, kind:"human",
    gender:"미설정", age:null, job:"", personality:"", speech:"",
    x_name:"", secret:"", current_feeling:"새로운 만남을 기대하고 있다.", memory:[]
  }];
  messages = [];
  if (supabase) {
    const { error } = await supabase.from("rooms").insert({
      id:room.id, code:room.code, title:room.title, phase:room.phase, day:room.day, state:room.state
    });
    if (error) return notify("방 생성 실패: " + error.message);
    const { error: playerError } = await supabase.from("players").insert(players[0]);
    if (playerError) return notify("참가자 저장 실패: " + playerError.message);
  }
  const aiCast = [0,1,2].map(index => createAI(index, room.id));
  aiCast[0].x_name = aiCast[1].name;
  aiCast[1].x_name = aiCast[0].name;
  players.push(...aiCast);
  if (supabase) {
    const { error } = await supabase.from("players").insert(aiCast);
    if (error) notify("AI 출연진 저장 알림: " + error.message);
  }
  localStorage.setItem(ROOM_KEY, code);
  await saveRoom();
  subscribeToRoom();
  renderRoom();
  notify("새로운 하우스가 열렸어요. 초대 코드를 공유해 보세요!");
}

async function joinRoom(code) {
  if (!code) return notify("초대 코드를 입력해 주세요.");
  if (!supabase) return notify("온라인 참여는 Supabase 연결 설정 후 이용할 수 있어요.");
  const { data: foundRoom, error } = await supabase.from("rooms").select("*").eq("code", code).maybeSingle();
  if (error || !foundRoom) return notify("방을 찾을 수 없어요. 초대 코드를 확인해 주세요.");
  room = foundRoom;
  const { data: cast, error: castError } = await supabase.from("players").select("*").eq("room_id", room.id);
  if (castError) return notify("출연진을 불러오지 못했어요: " + castError.message);
  players = cast || [];
  if (!players.some(player => player.id === playerId)) {
    const me = {
      id:playerId, room_id:room.id, name:getNickname(), kind:"human",
      gender:"미설정", age:null, job:"", personality:"", speech:"",
      x_name:"", secret:"", current_feeling:"새로운 만남을 기대하고 있다.", memory:[]
    };
    const { error: insertError } = await supabase.from("players").insert(me);
    if (insertError) return notify("참가 등록 실패: " + insertError.message);
    players.push(me);
  }
  const { data: chat, error: chatError } = await supabase.from("messages").select("*").eq("room_id", room.id).order("created_at", {ascending:true}).limit(200);
  if (!chatError) messages = chat || [];
  localStorage.setItem(ROOM_KEY, room.code);
  subscribeToRoom();
  renderRoom();
}

async function saveRoom() {
  if (!room) return;
  saveLocal();
  if (supabase) {
    const { error } = await supabase.from("rooms").update({
      title:room.title, phase:room.phase, day:room.day, state:room.state, updated_at:new Date().toISOString()
    }).eq("id", room.id);
    if (error) console.error("Room save error:", error.message);
  }
}

async function saveMessage(message) {
  messages.push(message);
  saveLocal();
  if (supabase) {
    const { error } = await supabase.from("messages").insert(message);
    if (error) notify("메시지 저장 실패: " + error.message);
  }
}

function subscribeToRoom() {
  if (!supabase || !room) return;
  if (channel) supabase.removeChannel(channel);
  channel = supabase.channel("afterlove-" + room.id)
    .on("postgres_changes", {event:"INSERT", schema:"public", table:"messages", filter:`room_id=eq.${room.id}`}, payload => {
      if (!messages.some(item => item.id === payload.new.id)) {
        messages.push(payload.new); saveLocal();
        if (activeTab === "chat") renderChat();
      }
    })
    .on("postgres_changes", {event:"*", schema:"public", table:"players", filter:`room_id=eq.${room.id}`}, async () => {
      const { data } = await supabase.from("players").select("*").eq("room_id", room.id);
      if (data) { players = data; if (activeTab === "cast") renderTab(); }
    })
    .on("postgres_changes", {event:"UPDATE", schema:"public", table:"rooms", filter:`id=eq.${room.id}`}, payload => {
      room = {...room, ...payload.new}; saveLocal();
    })
    .subscribe();
}

function renderRoom() {
  const me = players.find(player => player.id === playerId);
  page(`<section class="panel"><div class="room-head"><div><div class="muted">현재 진행 · ${escapeHtml(room.phase)}</div><h2>${escapeHtml(room.title)}</h2><div class="muted">DAY ${room.day} · 참가자 ${players.length}명</div></div><div><div class="muted">초대 코드</div><div class="room-code">${escapeHtml(room.code)}</div><button class="soft" id="copyCode" style="margin-top:7px">코드 복사</button></div></div></section>
  <nav class="tabs"><button data-tab="chat" class="${activeTab==="chat"?"active":""}">대화방</button><button data-tab="cast" class="${activeTab==="cast"?"active":""}">출연진</button><button data-tab="story" class="${activeTab==="story"?"active":""}">오늘의 일정</button><button data-tab="letter" class="${activeTab==="letter"?"active":""}">비밀 편지</button></nav>
  <div id="tabContent"></div><section class="panel room-head"><span class="muted">내 참가자: ${escapeHtml(me?.name || "참가자")}</span><button class="secondary" id="goHome">메인으로</button></section>`);
  $("#copyCode").onclick = async () => {
    try { await navigator.clipboard.writeText(room.code); notify("초대 코드를 복사했어요."); }
    catch { notify("초대 코드: " + room.code); }
  };
  $("#goHome").onclick = () => { if (channel) supabase?.removeChannel(channel); channel=null; room=null; home(); };
  document.querySelectorAll("[data-tab]").forEach(button => button.onclick = () => {
    activeTab = button.dataset.tab; renderRoom();
  });
  renderTab();
}

function renderTab() {
  const target = $("#tabContent");
  if (!target) return;
  if (activeTab === "chat") {
    target.innerHTML = `<section class="panel"><h3>하우스 단체 대화</h3><div class="chat" id="chatLog"></div><div class="composer"><input id="messageInput" maxlength="1500" placeholder="하고 싶은 말을 입력해 줘..."><button id="sendButton">보내기</button></div><p class="muted">AI 출연진이 각자의 성격에 맞춰 대화합니다. 실제 AI 응답에는 서버 API 키가 필요합니다.</p></section>`;
    renderChat();
    $("#sendButton").onclick = sendMessage;
    $("#messageInput").onkeydown = event => { if (event.key === "Enter") sendMessage(); };
  } else if (activeTab === "cast") {
    target.innerHTML = `<section class="panel"><h3>오늘 함께하는 사람들</h3><div class="grid">${players.map(person => `<article class="person"><strong>${escapeHtml(person.name)} ${person.kind==="human"?"(참가자)":"(AI 참가자)"}</strong><small>${escapeHtml(person.age ? person.age+"세 · " : "")}${escapeHtml(person.job || "")}</small><p>${escapeHtml(person.personality || "새로운 인연을 기다리는 중")}</p><small>현재 마음: ${escapeHtml(person.current_feeling || "아직 알 수 없음")}</small></article>`).join("")}</div><p class="muted">X 관계와 각자의 비밀은 추후 스토리 이벤트에서 공개하도록 확장할 수 있습니다.</p></section>`;
  } else if (activeTab === "story") {
    target.innerHTML = `<section class="panel"><h3>오늘의 일정</h3><div class="notice">DAY ${room.day} · ${escapeHtml(room.phase)}<br>함께 식사하고 대화를 나누며 서로를 알아가는 시간입니다.</div><div class="actions"><button id="nextDay">다음 날로 넘어가기</button><button class="secondary" id="dateMission">랜덤 데이트 미션</button></div><div id="storyResult" class="muted" style="margin-top:14px"></div></section>`;
    $("#nextDay").onclick = nextDay;
    $("#dateMission").onclick = dateMission;
  } else if (activeTab === "letter") {
    target.innerHTML = `<section class="panel"><h3>익명의 비밀 편지</h3><p class="muted">마음에 담아둔 말을 익명으로 남겨 보세요.</p><div class="field"><label>편지 내용</label><textarea id="letterText" rows="4" maxlength="800" placeholder="오늘 너에게 하지 못한 말..."></textarea></div><button id="sendLetter">익명 편지 보내기</button><div id="letterResult" class="notice" style="display:none;margin-top:12px"></div></section>`;
    $("#sendLetter").onclick = sendLetter;
  }
}

function renderChat() {
  const log = $("#chatLog");
  if (!log) return;
  log.innerHTML = messages.slice(-120).map(message => `<div class="bubble ${message.sender_id===playerId?"player":"other"}"><div class="who">${escapeHtml(message.sender_name || "참가자")}</div>${escapeHtml(message.content)}</div>`).join("");
  log.scrollTop = log.scrollHeight;
}

async function sendMessage() {
  if (sending) return;
  const input = $("#messageInput");
  const text = input?.value.trim();
  if (!text) return;
  input.value = "";
  const me = players.find(person => person.id === playerId);
  const message = {
    id:makeId(), room_id:room.id, sender_id:playerId, sender_name:me?.name || "나",
    content:text, kind:"chat", created_at:new Date().toISOString()
  };
  await saveMessage(message);
  renderChat();

  const aiCast = players.filter(person => person.kind === "ai");
  if (!aiCast.length) return;
  sending = true;
  const sendButton = $("#sendButton");
  if (sendButton) sendButton.disabled = true;
  const responder = aiCast[Math.floor(Math.random() * aiCast.length)];
  try {
    const reply = await getAIReply(responder, text);
    await saveMessage({
      id:makeId(), room_id:room.id, sender_id:responder.id, sender_name:responder.name,
      content:reply, kind:"chat", created_at:new Date().toISOString()
    });
    renderChat();
  } catch (error) {
    notify(error.message || "AI 답변을 가져오지 못했어요.");
  } finally {
    sending = false;
    if ($("#sendButton")) $("#sendButton").disabled = false;
  }
}

async function getAIReply(character, playerMessage) {
  const history = messages.slice(-14).map(message => ({
    role:message.sender_id === character.id ? "assistant" : "user",
    content:`${message.sender_name}: ${message.content}`
  }));
  const response = await fetch("/api/chat", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({character, history, playerMessage, scene:`${room.phase}, DAY ${room.day}`})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "AI 대화 오류");
  return data.reply;
}

async function nextDay() {
  room.day = Number(room.day || 1) + 1;
  room.phase = `DAY ${room.day} · 새로운 하루`;
  const events = [
    "오늘은 평소보다 어색한 침묵이 길어졌습니다.",
    "누군가 먼저 아침 식사를 준비했습니다.",
    "어제와는 다른 사람에게 시선이 향하기 시작했습니다.",
    "저녁, 마음을 확인하고 싶은 사람이 생겼습니다."
  ];
  const story = events[Math.floor(Math.random() * events.length)];
  room.state = {...(room.state || {}), storyLog:[...((room.state || {}).storyLog || []), story]};
  await saveRoom();
  await saveMessage({
    id:makeId(), room_id:room.id, sender_id:"system", sender_name:"하우스 안내",
    content:story, kind:"system", created_at:new Date().toISOString()
  });
  renderRoom();
  notify("새로운 하루가 시작됐어요.");
}

async function dateMission() {
  const places = ["조용한 바닷가 산책","작은 독립서점 데이트","야경이 보이는 루프탑","도자기 공방 체험","야외 피크닉","빈티지 사진관 방문"];
  const tasks = ["서로의 첫인상을 솔직하게 말하기","좋아하는 노래 한 곡 알려주기","가장 기억에 남는 여행 이야기하기","서로에게 궁금했던 질문 세 가지 하기"];
  const event = `랜덤 데이트: ${places[Math.floor(Math.random()*places.length)]}. 미션: ${tasks[Math.floor(Math.random()*tasks.length)]}.`;
  $("#storyResult").textContent = event;
  await saveMessage({id:makeId(),room_id:room.id,sender_id:"system",sender_name:"데이트 미션",content:event,kind:"system",created_at:new Date().toISOString()});
}

async function sendLetter() {
  const field = $("#letterText");
  const value = field.value.trim();
  if (!value) return notify("편지 내용을 입력해 주세요.");
  await saveMessage({
    id:makeId(),room_id:room.id,sender_id:playerId,sender_name:"익명의 편지",
    content:value,kind:"letter",created_at:new Date().toISOString()
  });
  field.value = "";
  const result = $("#letterResult");
  result.style.display = "block";
  result.textContent = "편지를 우편함에 넣었어요. 누가 받게 될까요?";
}

async function resumeGame() {
  const code = localStorage.getItem(ROOM_KEY);
  if (supabase && code) return joinRoom(code);
  const saved = loadLocal();
  if (!saved?.room) return notify("이어 할 게임이 없어요. 새 방을 만들어 주세요.");
  room = saved.room;
  players = saved.players || [];
  messages = saved.messages || [];
  subscribeToRoom();
  renderRoom();
  notify("이 기기에 저장된 게임을 불러왔어요.");
}

home();
