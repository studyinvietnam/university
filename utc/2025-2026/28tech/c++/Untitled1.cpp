#include <iostream>
#include <iomanip> // thu vien cua setprecision()

using namespace std;

int main() {
	cout << "Hello World !\n";
	int x, y, z;
	cin >> x >> y >> z;
	cout << y << ", " << z << ", " << x <<endl;
	double a = 129312.318238;
	double b = 129567.336473;
	cout << fixed << setprecision(2) << a << endl << fixed << setprecision(2) << b << endl;
	return 0;
}