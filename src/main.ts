import './styles.css';
import { Game } from './game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const titleScreen = document.getElementById('title-screen')!;
const startBtn = document.getElementById('start-btn')!;

const game = new Game(canvas);

startBtn.addEventListener('click', () => {
  titleScreen.classList.add('hidden');
  game.start();
});
