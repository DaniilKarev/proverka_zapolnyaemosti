const BOX_ROWS_LEFT = [6, 5, 4, 3, 2, 1];
const BOX_ROWS_RIGHT = [7, 6, 5, 10, 11, 12];

export function MultiTierHallBackdrop() {
  return (
    <g className="multi-tier-backdrop" aria-hidden="true">
      <rect width="1280" height="1269" className="multi-tier-page" />

      <defs>
        <path id="tier-2-right-label-path" d="M 68 205 Q 160 137 280 110" />
        <path id="tier-2-left-label-path" d="M 1000 110 Q 1120 137 1212 205" />
        <path id="tier-1-right-label-path" d="M 45 460 Q 170 326 380 250" />
        <path id="tier-1-left-label-path" d="M 900 250 Q 1110 326 1235 460" />
        <path id="mezzanine-right-label-path" d="M 125 755 Q 118 595 266 475" />
        <path id="mezzanine-left-label-path" d="M 1014 475 Q 1162 595 1155 755" />
      </defs>

      <g className="multi-tier-section-shapes">
        <path d="M 49 202 Q 151 133 269 99 L 319 231 Q 222 263 167 310 Z" />
        <path d="M 269 99 Q 640 -20 1017 97 L 970 231 Q 640 170 319 231 Z" />
        <path d="M 1017 97 Q 1135 132 1231 202 L 1137 318 Q 1068 270 970 231 Z" />

        <path d="M 18 485 Q 119 350 377 244 L 456 372 Q 242 438 132 578 Z" />
        <path d="M 377 244 Q 640 176 909 244 L 829 372 Q 640 326 456 372 Z" />
        <path d="M 909 244 Q 1160 349 1264 485 L 1148 568 Q 1043 438 829 372 Z" />

        <path d="M 96 850 Q 88 650 272 483 L 360 596 Q 246 700 246 850 Z" />
        <path d="M 272 483 Q 412 397 530 382 L 581 524 Q 455 529 360 596 Z" />
        <path d="M 530 382 Q 640 363 766 383 L 713 525 Q 640 510 581 524 Z" />
        <path d="M 766 383 Q 877 397 1028 484 L 934 596 Q 830 530 713 525 Z" />
        <path d="M 1028 484 Q 1190 646 1194 850 L 1045 850 Q 1045 700 934 596 Z" />

        <path d="M 245 713 Q 640 420 1045 713 L 915 713 Q 640 780 375 713 Z" />

        <rect x="375" y="713" width="540" height="407" rx="2" />
        <rect x="375" y="1120" width="540" height="92" rx="2" />

        {BOX_ROWS_LEFT.map((row, index) => (
          <rect key={`left-box-shape-${row}`} x="270" y={713 + index * 61} width="105" height="61" rx="10" />
        ))}
        <rect x="270" y="1079" width="105" height="133" rx="10" />

        {BOX_ROWS_RIGHT.map((row, index) => (
          <rect key={`right-box-shape-${row}`} x="915" y={713 + index * 61} width="105" height="61" rx="10" />
        ))}
        <rect x="915" y="1079" width="105" height="133" rx="10" />
      </g>

      <g className="multi-tier-labels">
        <text x="640" y="60" textAnchor="middle">
          Балкон 2-го яруса, середина
        </text>
        <text>
          <textPath href="#tier-2-right-label-path" startOffset="50%" textAnchor="middle">
            Балкон 2-го яруса, правая сторона
          </textPath>
        </text>
        <text>
          <textPath href="#tier-2-left-label-path" startOffset="50%" textAnchor="middle">
            Балкон 2-го яруса, левая сторона
          </textPath>
        </text>

        <text x="640" y="236" textAnchor="middle">
          Балкон 1-го яруса, середина
        </text>
        <text>
          <textPath href="#tier-1-right-label-path" startOffset="50%" textAnchor="middle">
            Балкон 1-го яруса, правая сторона
          </textPath>
        </text>
        <text>
          <textPath href="#tier-1-left-label-path" startOffset="50%" textAnchor="middle">
            Балкон 1-го яруса, левая сторона
          </textPath>
        </text>

        <text x="435" y="427" textAnchor="middle" transform="rotate(-17 435 427)">
          Бельэтаж, середина
        </text>
        <text x="640" y="406" textAnchor="middle">
          Ложа дирекции
        </text>
        <text x="847" y="427" textAnchor="middle" transform="rotate(17 847 427)">
          Бельэтаж, середина
        </text>
        <text>
          <textPath href="#mezzanine-right-label-path" startOffset="50%" textAnchor="middle">
            Бельэтаж, правая сторона
          </textPath>
        </text>
        <text>
          <textPath href="#mezzanine-left-label-path" startOffset="50%" textAnchor="middle">
            Бельэтаж, левая сторона
          </textPath>
        </text>

        <text x="640" y="574" textAnchor="middle">
          Амфитеатр
        </text>
        <text x="640" y="746" textAnchor="middle">
          Партер
        </text>
        <text x="640" y="1131" textAnchor="middle">
          VIP-партер
        </text>
        <text x="323" y="744" textAnchor="middle">
          Ложи
        </text>
        <text x="967" y="744" textAnchor="middle">
          Ложи
        </text>
      </g>

      <g className="multi-tier-row-labels">
        {Array.from({ length: 11 }, (_, index) => {
          const row = 11 - index;
          const y = 774 + index * 29;
          return (
            <g key={`parter-row-label-${row}`}>
              <text x="483" y={y} textAnchor="end">
                {row}
              </text>
              <text x="797" y={y}>
                {row}
              </text>
            </g>
          );
        })}

        {BOX_ROWS_LEFT.map((row, index) => (
          <text key={`left-box-label-${row}`} x="291" y={790 + index * 61} textAnchor="middle">
            {row}
          </text>
        ))}
        <text x="291" y="1146" textAnchor="middle">
          А
        </text>

        {BOX_ROWS_RIGHT.map((row, index) => (
          <text key={`right-box-label-${row}`} x="998" y={790 + index * 61} textAnchor="middle">
            {row}
          </text>
        ))}
        <text x="998" y="1146" textAnchor="middle">
          Б
        </text>
      </g>

      <path d="M 517 1250 Q 640 1234 773 1250" className="multi-tier-stage-arc" />
      <text x="640" y="1264" textAnchor="middle" className="multi-tier-stage-title">
        Сцена
      </text>
    </g>
  );
}
