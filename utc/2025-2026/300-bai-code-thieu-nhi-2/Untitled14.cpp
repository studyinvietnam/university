#include <stdio.h>
#include <stdlib.h>
#include <time.h>

int main () {
	char human, computer;
	unsigned h, c;
	srand( time( NULL ) );
	while ( 1 ) {
		printf( "Nhap ky tu (b-d-k), ky tu khac de thoat: " );
		scanf( "%c", &human );
		while ( getchar() != '\n' ) { }
		switch ( human ) {
			case 'b':
				switch ( rand() % 3 ) {
					case 0: computer= 'b'; break;
					case 1: computer= 'd'; h++; break;
					case 2: computer= 'k'; c++;
				}
				break;
			case 'd':
				switch ( rand() % 3 ) {
					case 0: computer= 'b'; c++; break;
					case 1: computer= 'd'; break;
					case 2: computer= 'k'; h++;
				}
				break;
			case 'k':
				switch ( rand() % 3 ) {
					case 0: computer= 'b'; h++; break;
					case 1: computer= 'd'; c++; break;
					case 2: computer= 'k';
				}
				break;
				default: return 0;
		}
		printf( "Computer: %c\n", computer );
		printf( "Ty so: %u - %u\n", h, c );
	}
}