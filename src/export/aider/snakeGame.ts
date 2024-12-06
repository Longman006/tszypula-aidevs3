class SnakeGame {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private box: number;
  private game: NodeJS.Timeout;
  private snake: { x: number; y: number }[];
  private direction: string;
  private food: { x: number; y: number };

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 400;
    this.canvas.height = 400;
    document.body.appendChild(this.canvas);
    this.context = this.canvas.getContext("2d")!;
    this.box = 20;
    this.snake = [];
    this.snake[0] = { x: 9 * this.box, y: 10 * this.box };
    this.direction = "";
    this.food = {
      x: Math.floor(Math.random() * 19 + 1) * this.box,
      y: Math.floor(Math.random() * 19 + 1) * this.box
    };

    document.addEventListener("keydown", this.directionControl.bind(this));
    this.startGame();
  }

  private directionControl(event: KeyboardEvent) {
    if (event.keyCode === 37 && this.direction !== "RIGHT") {
      this.direction = "LEFT";
    } else if (event.keyCode === 38 && this.direction !== "DOWN") {
      this.direction = "UP";
    } else if (event.keyCode === 39 && this.direction !== "LEFT") {
      this.direction = "RIGHT";
    } else if (event.keyCode === 40 && this.direction !== "UP") {
      this.direction = "DOWN";
    }
  }

  private collision(newHead: { x: number; y: number }, snake: { x: number; y: number }[]) {
    for (let i = 0; i < snake.length; i++) {
      if (newHead.x === snake[i].x && newHead.y === snake[i].y) {
        return true;
      }
    }
    return false;
  }

  private draw() {
    this.context.fillStyle = "lightgreen";
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.snake.length; i++) {
      this.context.fillStyle = i === 0 ? "green" : "white";
      this.context.fillRect(this.snake[i].x, this.snake[i].y, this.box, this.box);

      this.context.strokeStyle = "red";
      this.context.strokeRect(this.snake[i].x, this.snake[i].y, this.box, this.box);
    }

    this.context.fillStyle = "red";
    this.context.fillRect(this.food.x, this.food.y, this.box, this.box);

    let snakeX = this.snake[0].x;
    let snakeY = this.snake[0].y;

    if (this.direction === "LEFT") snakeX -= this.box;
    if (this.direction === "UP") snakeY -= this.box;
    if (this.direction === "RIGHT") snakeX += this.box;
    if (this.direction === "DOWN") snakeY += this.box;

    if (snakeX === this.food.x && snakeY === this.food.y) {
      this.food = {
        x: Math.floor(Math.random() * 19 + 1) * this.box,
        y: Math.floor(Math.random() * 19 + 1) * this.box
      };
    } else {
      this.snake.pop();
    }

    const newHead = { x: snakeX, y: snakeY };

    if (snakeX < 0 || snakeY < 0 || snakeX >= this.canvas.width || snakeY >= this.canvas.height || this.collision(newHead, this.snake)) {
      clearInterval(this.game);
    }

    this.snake.unshift(newHead);
  }

  private startGame() {
    this.game = setInterval(this.draw.bind(this), 100);
  }
}

new SnakeGame();
