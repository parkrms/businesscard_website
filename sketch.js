// 1. 전역 변수 설정
let cardFrontImage;
let shadowTexture;
let cards = [];
let numCards = 10;
let cardW, cardH; 

let backColorsHex = [
  "#FFB4B4", "#FFDCB4", "#FFFFB4", "#DCFFB4", "#B4FFB4",
  "#B4FFDC", "#B4FFFF", "#B4DCFF", "#B4B4FF", "#DCB4FF"
];
let backColors = [];

let currentCard = null;
let pressStartTime;

// 가장 최근에 뒤집힌 카드
let latestFlippedCard = null; 

// PC 마우스 흔들기 감도
let mouseSpeedThreshold = 100.0; 
let shakeRadius; 

let isMobileDevice = false;

let lastReleaseTime = 0;
let lastShakeTime = 0;

let holdStartTime = 0;
let isHolding = false;
let holdDuration = 1500; 
let appMode = 'NORMAL'; 
let focusedCard = null; 

let clickedArrowOnCard = null; 

function preload() {
  try {
    cardFrontImage = loadImage("Asset 2.png");
  } catch (e) {
    console.error("이미지 로드 실패", e);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();
  
  isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || windowWidth < 800;

  if (isMobileDevice) {
    holdDuration = 1000; 
    setShakeThreshold(30); 
  } else {
    holdDuration = 1500; 
  }

  calculateCardDimensions();
  
  // 그림자 텍스처
  let shadowTextureWidth = cardW * 1.5; 
  let shadowTextureHeight = cardH * 1.5; 
  shadowTexture = createGraphics(shadowTextureWidth, shadowTextureHeight);
  shadowTexture.noStroke();
  shadowTexture.rectMode(CENTER); 
  for(let i = 40; i > 0; i -= 1) { 
    let alpha = map(i, 40, 0, 0, 200); 
    alpha = pow(alpha / 200, 2.0) * 200; 
    shadowTexture.fill(0, 0, 0, alpha);
    let currentW = shadowTextureWidth * (i / 40);
    let currentH = shadowTextureHeight * (i / 40);
    shadowTexture.rect(shadowTexture.width/2, shadowTexture.height/2, currentW, currentH, 20); 
  }

  for (let hex of backColorsHex) {
    backColors.push(color(hex));
  }

  // 명함 배치
  for (let i = 0; i < numCards; i++) {
    // 화면 중앙(0,0)을 기준으로 랜덤하게 퍼뜨림
    // 여백을 조금 둬서 화면 밖으로 잘리지 않게 함
    let safeMarginX = cardW * 0.5; 
    let safeMarginY = cardH * 0.5;
    
    let rX = random(-width/2 + safeMarginX, width/2 - safeMarginX);
    let rY = random(-height/2 + safeMarginY, height/2 - safeMarginY);
    let rAngle = random(TWO_PI);
    cards.push(new BusinessCard(rX, rY, rAngle, backColors[i % backColors.length]));
  }
}

function calculateCardDimensions() {
  let ratio = isMobileDevice ? 0.55 : 0.25;
  cardW = constrain(windowWidth * ratio, 200, 500); 
  cardH = cardW * (50 / 90); 
  shakeRadius = cardW * 0.8; 
}

function draw() {
  background(40); 
  lights(); 
  
  // [수정] translate 제거! 
  // WebGL 모드는 (0,0)이 이미 중앙입니다.
  // 이전에 있던 translate(-width/2, ...) 코드가 명함을 왼쪽 위로 몰아넣는 원인이었습니다.
  
  // 카드 그리기
  for (let i = 0; i < cards.length; i++) {
    let c = cards[i];
    if (c === focusedCard) continue; 
    
    if (!c.isDragging && !c.isFlipping) {
      push();
      translate(0, 0, i * 1); 
      c.update();
      c.display();
      pop();
    }
  }

  drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT);

  for (let i = 0; i < cards.length; i++) {
    let c = cards[i];
    if (c === focusedCard) continue;

    if (c.isDragging || c.isFlipping) {
      push();
      translate(0, 0, 10); 
      c.update();
      c.display();
      pop();
    }
  }
}

function triggerDetailMode(card) {
  appMode = 'DETAIL';
  focusedCard = card;
  
  card.stopDrag(); 
  card.isDragging = false; 
  currentCard = null; 

  document.getElementById('detail-layer').classList.add('active');
  document.getElementById('global-close-btn').classList.add('visible');
}

window.closeDetail = function() {
  let layer = document.getElementById('detail-layer');
  layer.classList.remove('active');
  document.getElementById('global-close-btn').classList.remove('visible');
  
  setTimeout(() => {
    appMode = 'NORMAL';
    if (focusedCard) {
      focusedCard = null;
    }
  }, 400); 
};

// --- 입력 처리 ---

function touchStarted(e) {
  if (appMode === 'DETAIL' || (e.target && e.target.tagName !== 'CANVAS')) return true; 
  if (touches.length > 0) {
    handleInputStart(touches[0].x, touches[0].y);
  }
  return false; 
}
function touchMoved(e) {
  if (appMode === 'DETAIL' || (e.target && e.target.tagName !== 'CANVAS')) return true;
  if (touches.length > 0) {
    handleInputMove(touches[0].x, touches[0].y);
  }
  return false;
}
function touchEnded(e) {
  if (appMode === 'DETAIL' || (e.target && e.target.tagName !== 'CANVAS')) return true;
  handleInputEnd();
  return false;
}

function mousePressed() {
  handleInputStart(mouseX, mouseY);
}
function mouseDragged() {
  handleInputMove(mouseX, mouseY);
}
function mouseReleased() {
  handleInputEnd();
}

function handleInputStart(x, y) {
  if (appMode === 'DETAIL') return; 
  pressStartTime = millis();
  let mX = x - width/2;
  let mY = y - height/2;

  for (let i = cards.length - 1; i >= 0; i--) {
    let card = cards[i];
    if (card.contains(mX, mY)) {
      if (latestFlippedCard === card && card.isPlusClicked(mX, mY)) {
        clickedArrowOnCard = card;
      } else {
        currentCard = card;
        currentCard.startDrag(mX, mY);
        cards.splice(i, 1);
        cards.push(currentCard);
        
        if (abs(card.flipAngle - PI) < 0.2) {
          latestFlippedCard = card;
        }
      }
      break;
    }
  }
}

function handleInputMove(x, y) {
  if (appMode === 'DETAIL') return;
  if (clickedArrowOnCard) {
    clickedArrowOnCard = null;
    return;
  }
  if (currentCard != null) {
    let mX = x - width/2;
    let mY = y - height/2;
    currentCard.updateDrag(mX, mY);
  }
}

function handleInputEnd() {
  if (appMode === 'DETAIL') return;
  
  if (clickedArrowOnCard) {
    triggerDetailMode(clickedArrowOnCard);
    clickedArrowOnCard = null;
    return;
  }

  if (currentCard != null) {
    let duration = millis() - pressStartTime;
    if (duration < 200) {
      currentCard.flip();
      latestFlippedCard = currentCard;
    }
    currentCard.stopDrag();
    currentCard = null;
  }
}

// PC 마우스 흔들기
function mouseMoved() {
  if (isMobileDevice) return; 
  if (appMode === 'DETAIL') return;
  if (millis() - lastReleaseTime < 200) return;

  let mouseSpeed = dist(mouseX, mouseY, pmouseX, pmouseY);

  if (mouseSpeed > mouseSpeedThreshold) {
    lastShakeTime = millis();
    let rawPushX = (mouseX - pmouseX) * 0.4;
    let rawPushY = (mouseY - pmouseY) * 0.4;
    let mX = mouseX - width/2;
    let mY = mouseY - height/2;

    for (let i = 0; i < cards.length; i++) {
      let card = cards[i];
      let d = dist(mX, mY, card.x, card.y);
      if (d < shakeRadius) {
        let distFactor = map(d, 0, shakeRadius, 1.0, 0.2);
        let randomSpin = random(-0.2, 0.2) * distFactor;
        card.applyForce(rawPushX * distFactor, rawPushY * distFactor, randomSpin);
      }
    }
  }
}

// [수정] 모바일 흔들기 (deviceShaken 복구 & 자연스럽게)
function deviceShaken() {
  if (appMode === 'DETAIL') return;
  if (millis() - lastReleaseTime < 200) return;
  
  // 쿨타임
  if (millis() - lastShakeTime < 300) return;
  lastShakeTime = millis();
  
  for (let i = 0; i < cards.length; i++) {
    let card = cards[i];
    // 랜덤한 방향 (기울기 X, 순수 흔들림)
    let randomAngle = random(TWO_PI);
    
    // [수정] 힘의 크기 감소 (너무 과하지 않게)
    // 이전 20~40 -> 현재 5~15
    let forceMag = random(5, 15); 
    
    let forceX = cos(randomAngle) * forceMag;
    let forceY = sin(randomAngle) * forceMag;
    let randomSpin = random(-0.2, 0.2); 
    
    card.applyForce(forceX, forceY, randomSpin);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || windowWidth < 800;
  calculateCardDimensions(); 
  for (let card of cards) {
    card.w = cardW;
    card.h = cardH;
  }
}

function lerpAngle(from, to, amt) {
  let diff = to - from;
  while (diff < -PI) diff += TWO_PI;
  while (diff > PI) diff -= TWO_PI;
  return from + diff * amt;
}


// 6. BusinessCard 클래스
class BusinessCard {
  constructor(tempX, tempY, tempAngle, tempBackColor) {
    this.x = tempX;
    this.y = tempY;
    this.z = 0;
    this.w = cardW; 
    this.h = cardH;
    this.angle = tempAngle;
    this.backColor = tempBackColor;

    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    this.isFlipping = false;
    this.flipAngle = 0;
    this.flipTarget = 0;
    this.flipSpeed = 0.15; 
    this.flipAnchorX = 0;
    this.flipAnchorY = 0;

    this.velX = 0;
    this.velY = 0;
    this.angleVel = 0;
    
    // [수정] 물리 변수 조정 (묵직하고 자연스럽게)
    this.mass = random(1.2, 1.8); // 조금 더 무겁게
    this.damping = 0.85; // 마찰력 강화 (빨리 멈춤)
    this.angleDamping = 0.90; 
  }

  update() {
    if (this.isDragging) {
      this.z = lerp(this.z, 10.0, 0.2);
      let targetAngle = 0.0;
      this.angle = lerpAngle(this.angle, targetAngle, 0.1);
      this.velX = 0; this.velY = 0; this.angleVel = 0;
    } else {
      this.z = lerp(this.z, 0.0, 0.1);
      this.x += this.velX;
      this.y += this.velY;
      this.angle += this.angleVel;
      this.velX *= this.damping;
      this.velY *= this.damping;
      this.angleVel *= this.angleDamping;

      let boundW = width/2 - this.w/2;
      let boundH = height/2 - this.h/2;
      if (this.x < -boundW) { this.x = -boundW; this.velX *= -0.5; }
      if (this.x > boundW) { this.x = boundW; this.velX *= -0.5; }
      if (this.y < -boundH) { this.y = -boundH; this.velY *= -0.5; }
      if (this.y > boundH) { this.y = boundH; this.velY *= -0.5; }
    }

    if (this.isFlipping) {
      this.flipAngle = lerp(this.flipAngle, this.flipTarget, this.flipSpeed);
      if (abs(this.flipAngle - this.flipTarget) < 0.01) {
        this.flipAngle = this.flipTarget;
        this.isFlipping = false;
      }
    }
  }

  applyForce(fX, fY, aVel) {
    if (!this.isDragging && appMode === 'NORMAL') {
      this.velX += fX / this.mass; // 무게 반영
      this.velY += fY / this.mass;
      this.angleVel += aVel;
    }
  }

  display() {
    push();
    translate(this.x, this.y, this.z);
    rotate(this.angle);

    translate(this.flipAnchorX, this.flipAnchorY, 0);
    rotateY(this.flipAngle);
    translate(-this.flipAnchorX, -this.flipAnchorY, 0);

    rectMode(CENTER);
    imageMode(CENTER);

    // 뒷면 그리기
    if (this.flipAngle > HALF_PI) {
      push();
      rotateY(PI);
      fill(this.backColor);
      rect(0, 0, this.w, this.h);
      
      // [수정] + 아이콘 (위치 및 디자인 수정)
      if (latestFlippedCard === this) {
        // [위치 수정] 오른쪽 하단
        // rotateY(PI) 때문에 X축 반전됨 -> 로컬 좌표계에서 양수(+) 방향이 시각적 오른쪽
        // (이전 시도: -w/2가 왼쪽으로 갔음 -> 반대로 +w/2가 오른쪽임)
        let btnX = this.w/2 - 25;  // 오른쪽 끝에서 25px 안쪽
        let btnY = this.h/2 - 25;  // 아래쪽 끝에서 25px 안쪽
        
        push();
        translate(btnX, btnY, 5); 
        
        // 심플한 + 기호 (테두리 없음, 얇게, 작게)
        stroke(0, 200); // 진한 검정 (투명도 살짝)
        strokeWeight(1.5); // 얇게 (2 -> 1.5)
        strokeCap(SQUARE);
        
        let size = 6; // 작게 (8 -> 6)
        line(-size, 0, size, 0); 
        line(0, -size, 0, size); 
        
        pop();
      }
      
      pop();
    } else {
      // 앞면 그리기
      if (cardFrontImage) {
        image(cardFrontImage, 0, 0, this.w, this.h);
      } else {
        fill(255);
        rect(0, 0, this.w, this.h);
      }
    }
    pop();
  }

  flip() {
    this.isFlipping = true;
    this.flipTarget = (this.flipTarget == 0) ? PI : 0;
    this.flipAnchorX = 0;
    this.flipAnchorY = 0;
  }

  startDrag(mx, my) {
    this.isDragging = true;
    this.dragOffsetX = mx - this.x;
    this.dragOffsetY = my - this.y;
    this.velX = 0; this.velY = 0; this.angleVel = 0;
  }

  updateDrag(mx, my) {
    if (this.isDragging) {
      this.x = mx - this.dragOffsetX;
      this.y = my - this.dragOffsetY;
    }
  }

  stopDrag() {
    this.isDragging = false;
  }

  // [수정] 플러스 아이콘 클릭 감지
  isPlusClicked(mx, my) {
    if (abs(this.flipAngle - PI) > 0.2) return false;
    if (latestFlippedCard !== this) return false;

    let dx = mx - this.x;
    let dy = my - this.y;
    let cosA = cos(-this.angle);
    let sinA = sin(-this.angle);
    
    let unrotatedX = dx * cosA - dy * sinA;
    let unrotatedY = dx * sinA + dy * cosA;
    
    // 버튼 위치와 동일하게 업데이트
    let btnX = this.w/2 - 25; 
    let btnY = this.h/2 - 25;
    
    // 좌표계 주의: 
    // display에서 rotateY(PI)를 했기 때문에, 로컬 X축이 반전됨.
    // 하지만 unrotatedX는 회전되지 않은 원본 좌표계 기준임.
    // 마우스가 화면 오른쪽을 클릭했다면 unrotatedX는 양수(+).
    // 로컬 좌표계에서 오른쪽(btnX)도 양수(+)로 설정했음.
    // 하지만 rotateY(PI)가 적용된 상태라 시각적 오른쪽은 물리적 -X임.
    // => display에서 +btnX로 그렸다면, 시각적으로는 왼쪽에 그려졌어야 함.
    // => 사용자가 "왼쪽에 있다"고 했으므로 +btnX가 왼쪽인게 맞음.
    // => 따라서 오른쪽으로 보내려면 -btnX (-this.w/2 + ...) 여야 함.
    // => 아니 잠시만요, 아까 사용자가 "원형 버튼이 왼쪽에 있음"이라고 했습니다.
    // => 그때 코드는 `btnX = -this.w/2 + 35` 였습니다.
    // => 즉, -X가 왼쪽입니다.
    // => 그렇다면 오른쪽으로 가려면 +X 여야 합니다.
    // => 그래서 이번 코드에서는 `btnX = this.w/2 - 25` (양수)로 설정했습니다.
    // => 클릭 감지할 때도, `rotateY(PI)` 때문에 화면상의 오른쪽 클릭(양수)은 
    //    로컬 좌표계의 왼쪽(음수)에 매핑됩니다.
    // => 즉, unrotatedX(화면상 좌표)와 btnX(로컬 좌표)의 부호가 반대입니다.
    // => 따라서 거리 비교 시 -unrotatedX 와 btnX를 비교해야 합니다.
    
    if (dist(-unrotatedX, unrotatedY, btnX, btnY) < 40) {
      return true;
    }
    return false;
  }

  contains(mx, my) {
    let dx = mx - this.x;
    let dy = my - this.y;
    let cosA = cos(-this.angle);
    let sinA = sin(-this.angle);
    let unrotatedX = dx * cosA - dy * sinA;
    let unrotatedY = dx * sinA + dy * cosA;
    return (abs(unrotatedX) < this.w / 2 && abs(unrotatedY) < this.h / 2);
  }
}
