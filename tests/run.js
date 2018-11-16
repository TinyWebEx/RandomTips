import "https://unpkg.com/mocha@5.2.0/mocha.js"; /* globals mocha */

/* tests */
import "./dataTest/tips.test.js";
import "./randomTips.test.js";

mocha.checkLeaks();
mocha.run();
