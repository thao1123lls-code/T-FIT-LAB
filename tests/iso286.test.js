// Chạy: node tests/iso286.test.js  — đối chiếu với bảng ISO 286-2:2010
const I = require('../js/iso286.js');
let fail = 0;
const hole = (d, z, it, ES, EI) => { const r = I.getHoleDeviations(d, z, it); const ok = r.ES === ES && r.EI === EI; if (!ok) fail++; console.log(ok ? 'PASS' : 'FAIL', `Ø${d} ${z}${it}`, r.ES, r.EI, '(chuẩn', ES, EI + ')'); };
const shaft = (d, z, it, es, ei) => { const r = I.getShaftDeviations(d, z, it); const ok = r.es === es && r.ei === ei; if (!ok) fail++; console.log(ok ? 'PASS' : 'FAIL', `Ø${d} ${z}${it}`, r.es, r.ei, '(chuẩn', es, ei + ')'); };
hole(40, 'H', 7, 25, 0);   hole(40, 'G', 7, 34, 9);    hole(40, 'F', 8, 64, 25);
hole(50, 'K', 7, 7, -18);  hole(25, 'K', 8, 10, -23);  hole(25, 'K', 9, 0, -52);
hole(25, 'M', 7, 0, -21);  hole(25, 'N', 7, -7, -28);  hole(25, 'N', 9, 0, -52);
hole(2, 'N', 9, -4, -29);  hole(2, 'K', 7, 0, -10);    hole(25, 'P', 7, -14, -35);
hole(25, 'P', 8, -22, -55); hole(25, 'JS', 7, 10.5, -10.5); hole(40, 'P', 7, -17, -42);
shaft(40, 'g', 6, -9, -25); shaft(40, 'f', 7, -25, -50); shaft(40, 'k', 6, 18, 2);
shaft(40, 'm', 6, 25, 9);   shaft(40, 'n', 6, 33, 17);  shaft(40, 'p', 6, 42, 26);
shaft(40, 'r', 6, 50, 34);  shaft(40, 's', 6, 59, 43);  shaft(40, 'c', 11, -120, -280);
shaft(25, 'js', 6, 6.5, -6.5);
const r = I.calculateFit(40, 'H', 7, 'p', 6);
if (r.Smax !== -1 || r.Smin !== -42 || r.fitType !== 'INTERFERENCE') { fail++; console.log('FAIL H7/p6 fit'); }
console.log(fail ? `\n${fail} test FAIL` : '\nTất cả test ĐẠT'); process.exit(fail ? 1 : 0);
