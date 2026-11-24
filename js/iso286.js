
    /* =========================================================================
       MODULE 01 & 02: VERIFIED ISO 286-1:2010 & ISO 286-2:2010 DATABASE ENGINE
       - Strict adherence to ISO 286-1:2010 Table 1 (IT grades) & ISO 286-2:2010
         fundamental deviations in integer micrometers (µm).
       - Zero extrapolation outside (0, 500] mm. Zero fabricated numbers.
       ========================================================================= */
    const ISO286Database = {
      standardVersion: "ISO 286-1:2010 & ISO 286-2:2010",
      // Nominal size steps (lower exclusive, upper inclusive) in mm
      nominalSteps: [
        { id: 0, min: 0, max: 3, label: "Đến 3 mm" },
        { id: 1, min: 3, max: 6, label: "Trên 3 đến 6 mm" },
        { id: 2, min: 6, max: 10, label: "Trên 6 đến 10 mm" },
        { id: 3, min: 10, max: 18, label: "Trên 10 đến 18 mm" },
        { id: 4, min: 18, max: 30, label: "Trên 18 đến 30 mm" },
        { id: 5, min: 30, max: 50, label: "Trên 30 đến 50 mm" },
        { id: 6, min: 50, max: 80, label: "Trên 50 đến 80 mm" },
        { id: 7, min: 80, max: 120, label: "Trên 80 đến 120 mm" },
        { id: 8, min: 120, max: 180, label: "Trên 120 đến 180 mm" },
        { id: 9, min: 180, max: 250, label: "Trên 180 đến 250 mm" },
        { id: 10, min: 250, max: 315, label: "Trên 250 đến 315 mm" },
        { id: 11, min: 315, max: 400, label: "Trên 315 đến 400 mm" },
        { id: 12, min: 400, max: 500, label: "Trên 400 đến 500 mm" }
      ],
      // ISO 286-1:2010 Table 1: Standard Tolerance Grades IT5..IT11 in µm
      itGrades: {
        4:  [3,  4,  4,  5,  6,  7,  8,  10, 12, 14, 16, 18, 20],
        5:  [4,  5,  6,  8,  9,  11, 13, 15, 18, 20, 23, 25, 27],
        6:  [6,  8,  9,  11, 13, 16, 19, 22, 25, 29, 32, 36, 40],
        7:  [10, 12, 15, 18, 21, 25, 30, 35, 40, 46, 52, 57, 63],
        8:  [14, 18, 22, 27, 33, 39, 46, 54, 63, 72, 81, 89, 97],
        9:  [25, 30, 36, 43, 52, 62, 74, 87, 100,115,130,140,155],
        10: [40, 48, 58, 70, 84, 100,120,140,160,185,210,230,250],
        11: [60, 75, 90, 110,130,160,190,220,250,290,320,360,400]
      },
      // ISO 286-2:2010 Shaft Upper Deviations 'es' (for a..h) in µm
      shaftEsUpper: {
        d: [-20, -30, -40, -50, -65, -80, -100, -120, -145, -170, -190, -210, -230],
        e: [-14, -20, -25, -32, -40, -50, -60,  -72,  -85,  -100, -110, -125, -135],
        f: [-6,  -10, -13, -16, -20, -25, -30,  -36,  -43,  -50,  -56,  -62,  -68],
        g: [-2,  -4,  -5,  -6,  -7,  -9,  -10,  -12,  -14,  -15,  -17,  -18,  -20],
        h: [0,   0,   0,   0,   0,   0,   0,    0,    0,    0,    0,    0,    0]
      },
      // ISO 286-2:2010 Shaft Sub-step 'c' upper deviation es in µm
      getShaftCUpper(d) {
        if (d <= 3) return -60;
        if (d <= 6) return -70;
        if (d <= 10) return -80;
        if (d <= 18) return -95;
        if (d <= 30) return -110;
        if (d <= 40) return -120;
        if (d <= 50) return -130;
        if (d <= 65) return -140;
        if (d <= 80) return -150;
        if (d <= 100) return -170;
        if (d <= 120) return -180;
        if (d <= 140) return -200;
        if (d <= 160) return -210;
        if (d <= 180) return -230;
        if (d <= 200) return -240;
        if (d <= 225) return -260;
        if (d <= 250) return -280;
        if (d <= 280) return -300;
        if (d <= 315) return -330;
        if (d <= 355) return -360;
        if (d <= 400) return -400;
        if (d <= 450) return -440;
        return -480;
      },
      // ISO 286-2:2010 Shaft Lower Deviations 'ei' (for k..p) in µm
      shaftEiLower: {
        k_le7: [0,  1,  1,  1,  2,  2,  2,  3,  3,  4,  4,  4,  5],
        k_gt7: [0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
        m:     [2,  4,  6,  7,  8,  9,  11, 13, 15, 17, 20, 21, 23],
        n:     [4,  8,  10, 12, 15, 17, 20, 23, 27, 31, 34, 37, 40],
        p:     [6,  12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68]
      },
      // ISO 286-2:2010 Sub-step Shaft Lower Deviations 'ei' for r & s in µm
      getShaftRSLower(zone, d) {
        const rTable = [
          [3,10],[6,15],[10,19],[18,23],[30,28],[50,34],[65,41],[80,43],
          [100,51],[120,54],[140,63],[160,65],[180,68],[200,77],[225,80],
          [250,84],[280,94],[315,98],[355,108],[400,114],[450,126],[500,132]
        ];
        const sTable = [
          [3,14],[6,19],[10,23],[18,28],[30,35],[50,43],[65,53],[80,59],
          [100,71],[120,79],[140,92],[160,100],[180,108],[200,122],[225,130],
          [250,140],[280,158],[315,170],[355,190],[400,208],[450,232],[500,252]
        ];
        const tbl = zone === 'r' ? rTable : sTable;
        for (const [maxD, val] of tbl) {
          if (d <= maxD) return val;
        }
        return null;
      },

      findStep(d) {
        if (typeof d !== 'number' || isNaN(d) || d <= 0 || d > 500) return null;
        return this.nominalSteps.find(s => d > s.min && d <= s.max) || null;
      },

      getHoleDeviations(d, zone, it) {
        const step = this.findStep(d);
        if (!step) return { error: `Kích thước danh nghĩa D = ${d} mm nằm ngoài phạm vi tiêu chuẩn ISO 286-2:2010 (0 < D ≤ 500 mm).` };
        const TH = this.itGrades[it]?.[step.id];
        if (TH === undefined) return { error: `Cấp chính xác IT${it} chưa được cấu hình trong bảng xác minh.` };

        let ES, EI;
        if (zone === 'H') {
          EI = 0;
          ES = TH;
        } else if (zone === 'JS') {
          ES = TH / 2; // js: ±IT/2 (có thể là .5 µm khi IT lẻ)
          EI = -TH / 2;
        } else if (['D', 'E', 'F', 'G'].includes(zone)) {
          const shaftRef = this.shaftEsUpper[zone.toLowerCase()][step.id];
          EI = -shaftRef;
          ES = EI + TH;
        } else if (['K', 'M', 'N', 'P'].includes(zone)) {
          // ISO 286-1 §4.3.2: ES = -ei(trục tương ứng) + Δ, Δ = IT_n - IT_(n-1)
          // K,M,N: Δ áp dụng IT ≤ 8 ; P: Δ áp dụng IT ≤ 7 ; Δ = 0 khi D ≤ 3 mm
          const z = zone.toLowerCase();
          const eiShaft = this.shaftEiLower[z === 'k' ? 'k_le7' : z][step.id];
          const useDelta = zone === 'P' ? it <= 7 : it <= 8;
          const prev = this.itGrades[it - 1];
          const delta = (useDelta && d > 3 && prev) ? (TH - prev[step.id]) : 0;
          if (zone === 'K') ES = it <= 8 ? -eiShaft + delta : 0;
          else if (zone === 'N' && it > 8) ES = step.id === 0 ? -eiShaft : 0;
          else ES = -eiShaft + delta;
          EI = ES - TH;
        } else {
          return { error: `Miền dung sai lỗ "${zone}${it}" chưa có trong tập dữ liệu đã xác minh.` };
        }
        return { ES, EI, TH, step };
      },

      getShaftDeviations(d, zone, it) {
        const step = this.findStep(d);
        if (!step) return { error: `Kích thước danh nghĩa d = ${d} mm nằm ngoài phạm vi tiêu chuẩn ISO 286-2:2010 (0 < d ≤ 500 mm).` };
        const TS = this.itGrades[it]?.[step.id];
        if (TS === undefined) return { error: `Cấp chính xác IT${it} chưa được cấu hình trong bảng xác minh.` };

        let es, ei;
        if (zone === 'h') {
          es = 0;
          ei = -TS;
        } else if (zone === 'js') {
          es = TS / 2;
          ei = -TS / 2;
        } else if (zone === 'c') {
          es = this.getShaftCUpper(d);
          ei = es - TS;
        } else if (['d', 'e', 'f', 'g'].includes(zone)) {
          es = this.shaftEsUpper[zone][step.id];
          ei = es - TS;
        } else if (['k', 'm', 'n', 'p'].includes(zone)) {
          const key = zone === 'k' ? (it <= 7 ? 'k_le7' : 'k_gt7') : zone;
          ei = this.shaftEiLower[key][step.id];
          es = ei + TS;
        } else if (['r', 's'].includes(zone)) {
          ei = this.getShaftRSLower(zone, d);
          es = ei + TS;
        } else {
          return { error: `Miền dung sai trục "${zone}${it}" chưa có trong tập dữ liệu đã xác minh.` };
        }
        return { es, ei, TS, step };
      },

      /* SINGLE SOURCE OF TRUTH CALCULATION FUNCTION */
      calculateFit(nominalMm, holeZone, holeIT, shaftZone, shaftIT) {
        const d = Number(nominalMm);
        const hole = this.getHoleDeviations(d, holeZone, Number(holeIT));
        if (hole.error) return { valid: false, error: hole.error };
        const shaft = this.getShaftDeviations(d, shaftZone, Number(shaftIT));
        if (shaft.error) return { valid: false, error: shaft.error };

        // Integer micrometer calculations (avoid IEEE 754 floating point drift)
        const nominalUm = Math.round(d * 1000);
        const DmaxUm = nominalUm + hole.ES;
        const DminUm = nominalUm + hole.EI;
        const dmaxUm = nominalUm + shaft.es;
        const dminUm = nominalUm + shaft.ei;

        const Smax = hole.ES - shaft.ei; // µm
        const Smin = hole.EI - shaft.es; // µm
        const toleranceBand = hole.TH + shaft.TS; // Smax - Smin = TH + TS

        let fitType, fitTypeVi, fitBadgeClass, basisSystem;
        if (Smin >= 0) {
          fitType = 'CLEARANCE';
          fitTypeVi = 'Lắp lỏng';
          fitBadgeClass = 'bg-fitgreen text-emerald-100';
        } else if (Smax <= 0) {
          fitType = 'INTERFERENCE';
          fitTypeVi = 'Lắp chặt';
          fitBadgeClass = 'bg-burgundy-800 text-rose-100';
        } else {
          fitType = 'TRANSITION';
          fitTypeVi = 'Lắp trung gian';
          fitBadgeClass = 'bg-fitamber text-amber-100';
        }

        if (holeZone === 'H' && shaftZone === 'h') basisSystem = 'Hệ thống lỗ cơ sở & trục cơ sở (H/h)';
        else if (holeZone === 'H') basisSystem = 'Hệ thống lỗ cơ sở (H)';
        else if (shaftZone === 'h') basisSystem = 'Hệ thống trục cơ sở (h)';
        else basisSystem = 'Hệ thống lắp ghép phi cơ sở (Tổ hợp đặc biệt)';

        return {
          valid: true,
          standard: this.standardVersion,
          nominalMm: d,
          nominalUm,
          stepLabel: hole.step.label,
          designation: `Ø${d} ${holeZone}${holeIT}/${shaftZone}${shaftIT}`,
          holeCode: `${holeZone}${holeIT}`,
          shaftCode: `${shaftZone}${shaftIT}`,
          holeZone, holeIT: Number(holeIT),
          shaftZone, shaftIT: Number(shaftIT),
          ES: hole.ES, EI: hole.EI, TH: hole.TH,
          es: shaft.es, ei: shaft.ei, TS: shaft.TS,
          DmaxMm: (DmaxUm / 1000).toFixed(4).replace(/0+$/, '').replace(/\.$/, ''),
          DminMm: (DminUm / 1000).toFixed(4).replace(/0+$/, '').replace(/\.$/, ''),
          dmaxMm: (dmaxUm / 1000).toFixed(4).replace(/0+$/, '').replace(/\.$/, ''),
          dminMm: (dminUm / 1000).toFixed(4).replace(/0+$/, '').replace(/\.$/, ''),
          DmaxExact: DmaxUm / 1000,
          DminExact: DminUm / 1000,
          dmaxExact: dmaxUm / 1000,
          dminExact: dminUm / 1000,
          Smax, // µm
          Smin, // µm
          Nmax: Smin < 0 ? -Smin : 0, // Độ dôi lớn nhất (µm)
          Nmin: Smax < 0 ? -Smax : 0, // Độ dôi nhỏ nhất (µm)
          toleranceBand,
          fitType,
          fitTypeVi,
          fitBadgeClass,
          basisSystem
        };
      }
    };


if (typeof module !== 'undefined') module.exports = ISO286Database;
