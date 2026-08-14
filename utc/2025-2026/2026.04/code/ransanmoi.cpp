/*
 * GAME RAN SAN MOI - Snake Game
 * Bien dich: gcc snake.c -o snake
 * Chay:      ./snake
 *
 * Dieu khien:
 *   W / w   : Di len
 *   S / s   : Di xuong
 *   A / a   : Di trai
 *   D / d   : Di phai
 *   P / p   : Tam dung / Tiep tuc
 *   Q / q   : Thoat
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#ifdef _WIN32
  #include <conio.h>
  #include <windows.h>
  #define CLEAR "cls"
  #define SLEEP(ms) Sleep(ms)
  #define KBHIT() _kbhit()
  #define GETCH() _getch()
#else
  #include <unistd.h>
  #include <termios.h>
  #include <fcntl.h>
  #define CLEAR "clear"
  #define SLEEP(ms) usleep((ms) * 1000)

  /* Non-blocking keyboard cho Linux/macOS */
  static struct termios orig_termios;

  void enable_raw_mode() {
      struct termios raw = orig_termios;
      raw.c_lflag &= ~(ECHO | ICANON);
      raw.c_cc[VMIN] = 0;
      raw.c_cc[VTIME] = 0;
      tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw);
  }

  void disable_raw_mode() {
      tcsetattr(STDIN_FILENO, TCSAFLUSH, &orig_termios);
  }

  int KBHIT() {
      int ch = getchar();
      if (ch != EOF) {
          ungetc(ch, stdin);
          return 1;
      }
      return 0;
  }

  int GETCH() {
      return getchar();
  }
#endif

/* ===== Cau hinh game ===== */
#define WIDTH     30
#define HEIGHT    20
#define MAX_LEN   (WIDTH * HEIGHT)
#define INIT_LEN  3
#define SPEED_MS  150   /* milliseconds moi buoc */

/* Ky hieu hien thi */
#define WALL      '#'
#define FOOD      '@'
#define HEAD      'O'
#define BODY      'o'
#define EMPTY     ' '

/* Huong di chuyen */
typedef enum { UP, DOWN, LEFT, RIGHT } Direction;

/* Toa do */
typedef struct { int x, y; } Point;

/* Trang thai game */
typedef struct {
    Point  body[MAX_LEN];
    int    len;
    Direction dir;
    Point  food;
    int    score;
    int    running;
    int    paused;
} Game;

/* ===== Tien ich ===== */
void clear_screen() {
    system(CLEAR);
}

void place_food(Game *g) {
    Point p;
    int conflict;
    do {
        conflict = 0;
        p.x = rand() % WIDTH;
        p.y = rand() % HEIGHT;
        for (int i = 0; i < g->len; i++) {
            if (g->body[i].x == p.x && g->body[i].y == p.y) {
                conflict = 1;
                break;
            }
        }
    } while (conflict);
    g->food = p;
}

void init_game(Game *g) {
    memset(g, 0, sizeof(Game));
    g->len = INIT_LEN;
    g->dir = RIGHT;
    g->score = 0;
    g->running = 1;
    g->paused = 0;

    /* Ran bat dau o giua man hinh */
    for (int i = 0; i < INIT_LEN; i++) {
        g->body[i].x = WIDTH / 2 - i;
        g->body[i].y = HEIGHT / 2;
    }
    place_food(g);
}

/* ===== Ve man hinh ===== */
void draw(const Game *g) {
    /* Xay dung buffer de ve 1 lan, tranh nhayphay */
    char buf[HEIGHT + 2][WIDTH + 3];

    /* Bien border + nen */
    for (int y = 0; y < HEIGHT + 2; y++)
        for (int x = 0; x < WIDTH + 2; x++)
            buf[y][x] = EMPTY;

    /* Tuong */
    for (int x = 0; x < WIDTH + 2; x++) {
        buf[0][x]        = WALL;
        buf[HEIGHT+1][x] = WALL;
    }
    for (int y = 0; y < HEIGHT + 2; y++) {
        buf[y][0]       = WALL;
        buf[y][WIDTH+1] = WALL;
    }

    /* Thuc an */
    buf[g->food.y + 1][g->food.x + 1] = FOOD;

    /* Than ran */
    for (int i = g->len - 1; i > 0; i--)
        buf[g->body[i].y + 1][g->body[i].x + 1] = BODY;

    /* Dau ran */
    buf[g->body[0].y + 1][g->body[0].x + 1] = HEAD;

    /* In ra man hinh */
    clear_screen();
    printf("+--- SNAKE GAME --- Score: %4d ---+\n", g->score);
    for (int y = 0; y < HEIGHT + 2; y++) {
        for (int x = 0; x < WIDTH + 2; x++)
            putchar(buf[y][x]);
        putchar('\n');
    }
    printf("  [W/A/S/D] Di chuyen   [P] Tam dung   [Q] Thoat\n");
    if (g->paused)
        printf("\n  *** TAM DUNG - Nhan P de tiep tuc ***\n");
}

/* ===== Cap nhat logic ===== */
void update(Game *g) {
    if (!g->running || g->paused) return;

    /* Di chuyen than: dich chuyen tu cuoi len */
    for (int i = g->len - 1; i > 0; i--)
        g->body[i] = g->body[i - 1];

    /* Cap nhat vi tri dau */
    switch (g->dir) {
        case UP:    g->body[0].y--; break;
        case DOWN:  g->body[0].y++; break;
        case LEFT:  g->body[0].x--; break;
        case RIGHT: g->body[0].x++; break;
    }

    Point h = g->body[0];

    /* Va cham tuong */
    if (h.x < 0 || h.x >= WIDTH || h.y < 0 || h.y >= HEIGHT) {
        g->running = 0;
        return;
    }

    /* Va cham than */
    for (int i = 1; i < g->len; i++) {
        if (g->body[i].x == h.x && g->body[i].y == h.y) {
            g->running = 0;
            return;
        }
    }

    /* An duoc moi */
    if (h.x == g->food.x && h.y == g->food.y) {
        g->score += 10;
        if (g->len < MAX_LEN) {
            g->len++;
            /* Them doan duoi (giu nguyen vi tri cu, se bi ghi de o buoc sau) */
            g->body[g->len - 1] = g->body[g->len - 2];
        }
        place_food(g);
    }
}

/* ===== Xu ly phim ===== */
void handle_input(Game *g) {
    if (!KBHIT()) return;
    int ch = GETCH();

    /* Chuyen chu hoa thanh chu thuong */
    if (ch >= 'A' && ch <= 'Z') ch += 32;

    switch (ch) {
        case 'w': if (g->dir != DOWN)  g->dir = UP;    break;
        case 's': if (g->dir != UP)    g->dir = DOWN;  break;
        case 'a': if (g->dir != RIGHT) g->dir = LEFT;  break;
        case 'd': if (g->dir != LEFT)  g->dir = RIGHT; break;
        case 'p': g->paused = !g->paused;              break;
        case 'q': g->running = 0;                      break;
    }
}

/* ===== Man hinh ket thuc ===== */
void game_over(const Game *g) {
    clear_screen();
    printf("\n");
    printf("  +================================+\n");
    printf("  |        GAME OVER!              |\n");
    printf("  |  Diem so cua ban : %4d         |\n", g->score);
    printf("  |  Do dai ran      : %4d         |\n", g->len);
    printf("  +================================+\n");
    printf("\n  Nhan Enter de choi lai, Q de thoat: ");
    fflush(stdout);
}

/* ===== Ham chinh ===== */
int main() {
    srand((unsigned)time(NULL));

#ifndef _WIN32
    tcgetattr(STDIN_FILENO, &orig_termios);
    enable_raw_mode();
    atexit(disable_raw_mode);
#endif

    char again;
    do {
        Game g;
        init_game(&g);

        while (g.running) {
            handle_input(&g);
            update(&g);
            if (g.running || !g.paused)
                draw(&g);
            SLEEP(SPEED_MS);
        }

        /* Hien thi game over */
#ifndef _WIN32
        disable_raw_mode();
#endif
        game_over(&g);

        /* Doc lua chon */
        again = 0;
        int c;
        while ((c = getchar()) != '\n' && c != EOF);
        again = getchar();

#ifndef _WIN32
        tcgetattr(STDIN_FILENO, &orig_termios);
        enable_raw_mode();
#endif

    } while (again != 'q' && again != 'Q');

#ifndef _WIN32
    disable_raw_mode();
#endif

    clear_screen();
    printf("Cam on da choi! Hen gap lai.\n");
    return 0;
}