/* Scene painters by id, in scroll order. Each takes { W, H, dpr, mobile }
   and returns plain data plus canvases; bakery.js runs them in a worker. */
import { paintAll as traveling } from './scenes/traveling-paint.js';
import photography from './scenes/photography-paint.js';
import editing from './scenes/editing-paint.js';
import gaming from './gaming/paint.js';
import cinema from './scenes/cinema-paint.js';
import reading from './scenes/reading-paint.js';
import swimming from './scenes/swimming-paint.js';
import food from './scenes/food-paint.js';
import teaching from './scenes/teaching-paint.js';

export const PAINTERS = { traveling, photography, editing, gaming, cinema, reading, swimming, food, teaching };
export const ORDER = ['traveling', 'photography', 'editing', 'gaming', 'cinema', 'reading', 'swimming', 'food', 'teaching'];
