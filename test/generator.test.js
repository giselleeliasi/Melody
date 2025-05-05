import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";
import optimize from "../src/optimizer.js";
import generate from "../src/generator.js";

function dedent(s) {
  return `${s}`.replace(/(?<=\n)\s+/g, "").trim();
}

const fixtures = [
  {
    name: "basic_operations",
    source: `
      let x = 3 * 7;
      x++;
      x--;
      let y = on;
      y = 5 ** -x / -100 > -x || off;
      play (y && y) || off || (x*2) != 5;
    `,
    expected: dedent`
      let x_1 = 21;
      x_1++;
      x_1--;
      let y_2 = true;
      y_2 = (((5 ** -(x_1)) / -(100)) > -(x_1));
      console.log(((y_2 && y_2) || ((x_1 * 2) !== 5)));
    `,
  },
  {
    name: "if_statements",
    source: `
      let x = 0;
      if x == 0 { play "zero"; }
      if x == 0 { play 1; } else { play 2; }
      if x == 0 { play 1; } else if x == 2 { play 3; }
      if x == 0 { play 1; } else if x == 2 { play 3; } else { play 4; }
    `,
    expected: dedent`
      let x_1 = 0;
      if ((x_1 === 0)) {
        console.log("zero");
      }
      if ((x_1 === 0)) {
        console.log(1);
      } else {
        console.log(2);
      }
      if ((x_1 === 0)) {
        console.log(1);
      } else
        if ((x_1 === 2)) {
          console.log(3);
        }
      if ((x_1 === 0)) {
        console.log(1);
      } else
        if ((x_1 === 2)) {
          console.log(3);
        } else {
          console.log(4);
        }
    `,
  },
  {
    name: "repeat_statements",
    source: `
      let x = 0;
      repeatWhile x < 5 {
        let y = 0;
        repeatWhile y < 5 {
          play x * y;
          y = y + 1;
          break;
        }
        x = x + 1;
      }
      repeat 3 {
        play "three times";
      }
    `,
    expected: dedent`
      let x_1 = 0;
      while ((x_1 < 5)) {
        let y_2 = 0;
        while ((y_2 < 5)) {
          console.log((x_1 * y_2));
          y_2 = (y_2 + 1);
          break;
        }
        x_1 = (x_1 + 1);
      }
      for (let i_3 = 0; i_3 < 3; i_3++) {
        console.log("three times");
      }
    `,
  },
  {
    name: "measure_declarations",
    source: `
      let z = 0.5;
      measure f(x: float, y: boolean) {
        play sin(x) > 3.14;
        return;
      }
      measure g(): boolean {
        return off;
      }
      f(z, g());
    `,
    expected: dedent`
      let z_1 = 0.5;
      function f_2(x_3, y_4) {
        console.log((Math.sin(x_3) > 3.14));
        return;
      }
      function g_5() {
        return false;
      }
      f_2(z_1, g_5());
    `,
  },
  {
    name: "arrays",
    source: `
      let a = [on, off, on];
      let b = [10, #a - 20, 30];
      const c = [[int]]();
      const d = random b;
      play a[1] || (b[0] < 88 ? off : on);
    `,
    expected: dedent`
      let a_1 = [true,false,true];
      let b_2 = [10,(a_1.length - 20),30];
      let c_3 = [];
      let d_4 = ((a=>a[~~(Math.random()*a.length)])(b_2));
      console.log((a_1[1] || (((b_2[0] < 88)) ? (false) : (true))));
    `,
  },
  {
    name: "grand_declarations",
    source: `
      grand Note { pitch: int, duration: float }
      let x = Note(60, 0.5);
      play x.pitch;
    `,
    expected: dedent`
      class Note_1 {
      constructor(pitch_2, duration_3) {
      this["pitch_2"] = pitch_2;
      this["duration_3"] = duration_3;
      }
      }
      let x_4 = new Note_1(60, 0.5);
      console.log((x_4["pitch_2"]));
    `,
  },
  {
    name: "optionals",
    source: `
      let x = no int;
      let y = x ?? 2;
      grand Note { pitch: int }
      let z = some Note(1);
      let w = z?.pitch;
    `,
    expected: dedent`
      let x_1 = undefined;
      let y_2 = (x_1 ?? 2);
      class Note_3 {
      constructor(pitch_4) {
      this["pitch_4"] = pitch_4;
      }
      }
      let z_5 = new Note_3(1);
      let w_6 = (z_5?.["pitch_4"]);
    `,
  },
  {
    name: "for_loops",
    source: `
      for i in 1..<50 {
        play i;
      }
      for j in [10, 20, 30] {
        play j;
      }
      repeat 3 {
        play "count";
      }
      for k in 1...10 {
        play k;
      }
    `,
    expected: dedent`
      for (let i_1 = 1; i_1 < 50; i_1++) {
        console.log(i_1);
      }
      for (let j_2 of [10,20,30]) {
        console.log(j_2);
      }
      for (let i_3 = 0; i_3 < 3; i_3++) {
        console.log("count");
      }
      for (let k_4 = 1; k_4 <= 10; k_4++) {
        console.log(k_4);
      }
    `,
  },
  {
    name: "conditionals",
    source: `
      let x = 5;
      let y = x > 3 ? "large" : "small";
      let z = x > 10 ? 100 : x < 0 ? -1 : 0;
      play y;
      play z;
    `,
    expected: dedent`
      let x_1 = 5;
      let y_2 = (((x_1 > 3)) ? ("large") : ("small"));
      let z_3 = (((x_1 > 10)) ? (100) : (((x_1 < 0)) ? (-1) : (0)));
      console.log(y_2);
      console.log(z_3);
    `,
  },
  {
    name: "standard_library",
    source: `
      let x = 0.5;
      play sin(x) - cos(x) + exp(x) * ln(x) / hypot(2.3, x);
      play bytes("∞§¶•");
      play codepoints("💪🏽💪🏽");
    `,
    expected: dedent`
      let x_1 = 0.5;
      console.log(((Math.sin(x_1) - Math.cos(x_1)) + ((Math.exp(x_1) * Math.log(x_1)) / Math.hypot(2.3,x_1))));
      console.log([...Buffer.from("∞§¶•", "utf8")]);
      console.log([...("💪🏽💪🏽")].map(s=>s.codePointAt(0)));
    `,
  },
  {
    name: "nested_structures",
    source: `
      grand Point { x: float, y: float }
      grand Line { start: Point, end: Point }
      
      measure length(line: Line): float {
        let dx = line.end.x - line.start.x;
        let dy = line.end.y - line.start.y;
        return hypot(dx, dy);
      }
      
      let p1 = Point(0.0, 0.0);
      let p2 = Point(3.0, 4.0);
      let line = Line(p1, p2);
      play length(line);
    `,
    expected: dedent`
      class Point_1 {
      constructor(x_2, y_3) {
      this["x_2"] = x_2;
      this["y_3"] = y_3;
      }
      }
      class Line_4 {
      constructor(start_5, end_6) {
      this["start_5"] = start_5;
      this["end_6"] = end_6;
      }
      }
      function length_7(line_8) {
        let dx_9 = ((line_8["end_6"]["x_2"]) - (line_8["start_5"]["x_2"]));
        let dy_10 = ((line_8["end_6"]["y_3"]) - (line_8["start_5"]["y_3"]));
        return Math.hypot(dx_9, dy_10);
      }
      let p1_11 = new Point_1(0.0, 0.0);
      let p2_12 = new Point_1(3.0, 4.0);
      let line_13 = new Line_4(p1_11, p2_12);
      console.log(length_7(line_13));
    `,
  },
  {
    name: "bitwise_operations",
    source: `
      let a = 5;
      let b = 3;
      play a & b;
      play a | b;
      play a ^ b;
      play a << 2;
      play b >> 1;
    `,
    expected: dedent`
      let a_1 = 5;
      let b_2 = 3;
      console.log((a_1 & b_2));
      console.log((a_1 | b_2));
      console.log((a_1 ^ b_2));
      console.log((a_1 << 2));
      console.log((b_2 >> 1));
    `,
  },
  {
    name: "nil_and_complex_optionals",
    source: `
      let x = nil;
      grand Person { name: string, age: int }
      let p = Person("Alice", 30);
      let q = nil;
      play p?.name ?? "Unknown";
      play q?.name ?? "Nobody";
      let arr = [1, 2, 3];
      play arr?[1] ?? 0;
    `,
    expected: dedent`
      let x_1 = null;
      class Person_2 {
      constructor(name_3, age_4) {
      this["name_3"] = name_3;
      this["age_4"] = age_4;
      }
      }
      let p_5 = new Person_2("Alice", 30);
      let q_6 = null;
      console.log((p_5?.["name_3"] ?? "Unknown"));
      console.log((q_6?.["name_3"] ?? "Nobody"));
      let arr_7 = [1,2,3];
      console.log((arr_7?.[1] ?? 0));
    `,
  },
];

describe("The Melody code generator", () => {
  for (const fixture of fixtures) {
    it(`produces expected JavaScript output for the ${fixture.name} program`, () => {
      const actual = generate(optimize(analyze(parse(fixture.source))));
      assert.deepEqual(actual, fixture.expected);
    });
  }
});
