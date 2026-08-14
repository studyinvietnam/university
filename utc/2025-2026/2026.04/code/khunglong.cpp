#include <stdio.h>
#include <conio.h>
#include <windows.h>

#define WIDTH 50
#define HEIGHT 10

int dinoY = 0;
int jump = 0;
int duck = 0;

int obstacleX = WIDTH - 1;
int birdX = WIDTH + 10;

int score = 0;
int gameOver = 0;

int speed = 120; // càng nhỏ càng nhanh

void draw() {
    system("cls");

    for (int i = 0; i < HEIGHT; i++) {
        for (int j = 0; j < WIDTH; j++) {

            // 🦖 Dino
            if (j == 5) {
                if (duck && i == HEIGHT - 1)
                    printf("D"); // cúi
                else if (!duck && i == HEIGHT - 2 - dinoY)
                    printf("D");
                else
                    printf(" ");
            }

            // 🌵 Cactus
            else if (j == obstacleX && i == HEIGHT - 2)
                printf("|");

            // 🐦 Bird
            else if (j == birdX && i == HEIGHT - 4)
                printf("^");

            // mặt đất
            else if (i == HEIGHT - 1)
                printf("_");

            else
                printf(" ");
        }
        printf("\n");
    }

    printf("Score: %d | Speed: %d\n", score, speed);
}

void update() {
    // jump logic
    if (jump) {
        dinoY++;
        if (dinoY > 2) jump = 0;
    } else {
        if (dinoY > 0) dinoY--;
    }

    // cactus move
    obstacleX--;
    if (obstacleX < 0) {
        obstacleX = WIDTH - 1;
        score++;
    }

    // bird move
    birdX--;
    if (birdX < 0) {
        birdX = WIDTH + 20;
    }

    // va chạm cactus
    if (obstacleX == 5 && dinoY == 0 && !duck) {
        gameOver = 1;
    }

    // va chạm bird
    if (birdX == 5 && !duck) {
        gameOver = 1;
    }

    // tăng tốc theo điểm
    if (score % 5 == 0 && speed > 40) {
        speed -= 2;
    }
}

int main() {
    printf("W = jump | S = duck | ESC = quit\n");
    Sleep(1500);

    while (!gameOver) {

        // input
        if (_kbhit()) {
            char ch = _getch();

            if ((ch == 'w' || ch == 'W') && dinoY == 0)
                jump = 1;

            if (ch == 's' || ch == 'S')
                duck = 1;

            if (ch == 27)
                break;
        } else {
            duck = 0; // thả S là đứng lại
        }

        update();
        draw();

        Sleep(speed);
    }

    printf("\n💀 Game Over! Score: %d\n", score);
    return 0;
}