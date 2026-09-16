#include <bits/stdc++.h>

using namespace std;

/*
- Yeu cau: Xay dung lop ThoiGian bao gom:
	1. Khai bao 3 thuoc tinh int: gio, phut, giay.
	2. 
	3. 
	4. 
	5. 
- Yeu cau trong ham main(): Trong main(), t1 = ThoiGian(8, 30, 0), nhap t2. In t2 sau chuan hoa va kiem ta t1 == t2
*/

class ThoiGian{
	private:
		int gio;
		int phut;
		int giay;
	public:
		ThoiGian(){
			gio = 0; 
			phut = 0; 
			giay = 0; 
		}
    void chuanHoa() {
        if (giay >= 60) {
            phut += giay / 60;
            giay = giay % 60;
        }
        if (phut >= 60) {
            gio += phut / 60;
            phut = phut % 60;
        }
        if (gio >= 24) {
            gio = gio % 24;
        }
    }
    ThoiGian(int gio, int phut, int giay) {
        this->gio = gio;
        this->phut = phut;
        this->giay = giay;
        this->chuanHoa();
    }
	friend istream& operator >>(istream &is, ThoiGian &tg) {
	    cout << endl << "\nNhap phan tu gio, phut, giay cua thoi gian: ";
	    is >> tg.gio >> tg.phut >> tg.giay;
	    tg.chuanHoa(); 
	    return is;
	}
	friend ostream& operator <<(ostream &os, ThoiGian tg) {
	    os << tg.gio << "h" << tg.phut << "m" << tg.giay << "s";
	    return os;
	}
	bool operator ==(ThoiGian tg) {
	    return (this->gio == tg.gio && this->phut == tg.phut && this->giay == tg.giay);
	}
};

void soSanh(ThoiGian t1, ThoiGian t2) {
    if (t1 == t2) {
        cout << "2 thoi gian giong nhau" << endl;
    }
    else {
        cout << "2 thoi gian khac nhau" << endl;
    }
}


int main() {
    ThoiGian t1, t2;
    t1 = ThoiGian(8, 30, 0);
    cout << "Nhap ThoiGian 2: ";
    cin >> t2;
	cout << endl;
    cout << "ThoiGian 2: " << t2 << endl;
	cout << endl;
    soSanh(t1, t2);
    return 0;
}
