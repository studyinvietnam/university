#include <iostream>
#include <iomanip>

using namespace std;

int main() {
	cout << "Int: ";
	int x; cin >> x;
	long long y; cin >> y;
	char c;
	cout << "Char: ";
	cin >> c;
	float f;
	cout << "Float: ";
	cin >> f;
	double d;
	cout << "Double: ";
	cin >> d;
	cout << "Output:\n" << x << endl << y << endl << c << endl;
	cout << fixed << setprecision(2) << f << endl << fixed << setprecision(9) << d << endl;
	return 0;
}