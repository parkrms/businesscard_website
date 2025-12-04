// ... (전역 변수 및 setup 등 기존과 동일) ...

// [BusinessCard 클래스의 display 함수 수정]
// 이 부분을 기존 sketch.js의 BusinessCard 클래스 안에 덮어쓰시면 됩니다.

  display() {
    push();
    translate(this.x, this.y, this.z);
    rotate(this.angle);

    // 뒤집기 회전 적용
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
      
      // [수정] 뒷면 우측 하단 화살표 (Glassy Button Style)
      // rotateY(PI) 때문에 좌우가 반전되어 있음. 
      // 화면상 우측 하단 = 로컬 좌표계에서 좌측 하단 (-x, +y)
      
      let btnX = -this.w/2 + 35; // 왼쪽 가장자리에서 35px 안쪽
      let btnY = this.h/2 - 35;  // 아래쪽 가장자리에서 35px 안쪽
      
      push();
      translate(btnX, btnY, 2); // 카드 표면보다 살짝 위로 (z=2)
      
      // 1. 유리 느낌의 원형 버튼 배경 (가우시안 느낌)
      noStroke();
      fill(255, 40); // 아주 투명한 흰색
      ellipse(0, 0, 44, 44);
      
      // 2. 얇은 테두리 (옵션, 더 고급스럽게)
      noFill();
      stroke(255, 80);
      strokeWeight(1);
      ellipse(0, 0, 44, 44);
      
      // 3. 화살표 텍스트
      fill(255, 200); // 약간 투명한 흰색 텍스트
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(20); 
      // 폰트는 시스템 폰트 느낌을 위해 sans-serif 적용
      textFont('sans-serif');
      text("↘", 2, 2); // 시각적 중심 보정
      pop();
      
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

  // [수정] 화살표 클릭 감지 로직
  isArrowClicked(mx, my) {
    if (abs(this.flipAngle - PI) > 0.2) return false;

    let dx = mx - this.x;
    let dy = my - this.y;
    let cosA = cos(-this.angle);
    let sinA = sin(-this.angle);
    
    let unrotatedX = dx * cosA - dy * sinA;
    let unrotatedY = dx * sinA + dy * cosA;
    
    // 뒷면이므로 X축 반전 (rotateY(PI) 효과)
    // 화면상 우측 하단 클릭 -> 로컬상 좌측 하단(-x, +y) 체크
    
    // 버튼 중심 좌표 (display함수의 btnX, btnY와 동일)
    let btnX = -this.w/2 + 35; 
    let btnY = this.h/2 - 35;
    
    // 마우스 좌표(unrotatedX)를 반전시켜서 비교하거나, 
    // 그냥 반전된 로컬 좌표계(-unrotatedX)를 사용
    
    // 화면상 클릭 위치가 우측 하단이면 unrotatedX는 양수(+)임.
    // 하지만 뒷면 로컬 좌표계에서는 우측 하단이 -x임.
    // 따라서 unrotatedX를 뒤집어서(-unrotatedX) 버튼 위치와 비교해야 함.
    
    // 버튼 반경 30px (터치 영역 넉넉하게)
    if (dist(-unrotatedX, unrotatedY, btnX, btnY) < 30) {
      return true;
    }
    return false;
  }

// ... (나머지 클래스 함수들 동일) ...
