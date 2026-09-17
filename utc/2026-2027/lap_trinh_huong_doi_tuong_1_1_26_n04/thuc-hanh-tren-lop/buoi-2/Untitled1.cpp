#include <bits/stdc++.h>

using namespace std;

/*
- Yeu cau: Xay dung lop Vector2Chieu bao gom:
	1. Khai bao 2 thuoc tinh double: x, y. 
	2. Viet cau tu co doi mac dinh x = 0; y = 0.
	3. Nap chong toan tu + de cong 2 vector. 
	4. Nap chong toan tu != de kiem tra 2 vector khac nhau.
- Yeu cau trong ham main(): Trong main(), nhap v1, v2; tinh v3 = v1 + v2 va in v3. Neu v1 != v2 thi in "Khac nhau", nguoc lai in "Giong nhau". 
*/

class Vector2Chieu {
	private:
		double x;
		double y;
	public:
		Vector2Chieu() {
			x = 0;
			y = 0; 
		}
	    friend istream& operator >>(istream &is, Vector2Chieu &vt2c) {
	        cout << endl << "\nNhap phan tu x, y cua vector: ";
	        is >> vt2c.x >> vt2c.y;
	        return is;
	    }
	    friend ostream& operator <<(ostream &os, Vector2Chieu vt2c) {
	        os << "(" << vt2c.x << ", " << vt2c.y << ")" << endl;
	        return os;
	    }
	    Vector2Chieu operator +(Vector2Chieu vt2c) {
	        Vector2Chieu t;
	        t.x = this->x + vt2c.x;
	        t.y = this->y + vt2c.y;
	        return t;
	    }
		bool operator ==(Vector2Chieu vt2c) {
		    return (this->x == vt2c.x && this->y == vt2c.y);
		}
		bool operator !=(Vector2Chieu vt2c) {
		    return (this->x != vt2c.x || this->y != vt2c.y);
		}
};

void soSanh(Vector2Chieu v1, Vector2Chieu v2) {
    if (v1 == v2) {
        cout << "Giong nhau" << endl;
    }
    if (v1 != v2) {
        cout << "Khac nhau" << endl;
    }
}

int main(){
	Vector2Chieu v1, v2;
	cout << "Nhap vector 1: ";
	cin >> v1;
	cout << endl;
	cout << "Nhap vector 2: ";
	cin >> v2;
	cout << endl << endl;
	cout << "=> Vector 1: ";
	cout << v1; 
	cout << endl;
	cout << "=> Vector 2: ";
	cout << v2; 
	cout << endl;
	Vector2Chieu v3 = v1 + v2;
	cout << "=> Vector 3: ";
	cout << v3; 
	cout << endl;
	soSanh(v1, v2);
	return 0; 
}
