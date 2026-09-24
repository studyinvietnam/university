#include<bits/stdc++.h>

using namespace std;
using ll = long long;

class Vector2Chieu {
	private:
		double x;
		double y;
	public:
		Vector2Chieu() {
			x = 0;
			y = 0; 
		}
	    friend istream& operator >>(istream &is, Vector2Chieu &v) {
	        cout << endl << "\nNhap phan tu x, y cua vector: ";
	        is >> v.x >> v.y;
	        return is;
	    }
	    friend ostream& operator <<(ostream &os, Vector2Chieu v) {
	        os << "(" << v.x << ", " << v.y << ")" << endl;
	        return os;
	    }
		double operator *(Vector2Chieu v) {
	        return (this->x*v.x+this->y*v.y);
    	}
	    Vector2Chieu operator +=(Vector2Chieu v) {
	        this->x = this->x + v.x;
	        this->y = this->y + v.y;
	        return *this;
	    }
		bool operator !=(Vector2Chieu v) {
		    return (this->x != v.x || this->y != v.y);
		}
};

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
		bool operator >(ThoiGian tg) {
		    if (this->gio > tg.gio) {
		        return true; // Nếu giờ lớn hơn, trả về true
		    } else if (this->gio == tg.gio) {
		        if (this->phut > tg.phut) {
		            return true; // Nếu giờ bằng nhau, so sánh phút
		        } else if (this->phut == tg.phut) {
		            return this->giay > tg.giay; // Nếu phút cũng bằng nhau, so sánh giây
		        }
		    }
		    return false; // Trả về false nếu không thỏa mãn điều kiện
		}
		ThoiGian operator ++(int) { // Toán tử tăng sau
		    ThoiGian temp = *this; // Lưu giá trị hiện tại trong biến temp
		    this->giay++; // Tăng giây lên 1
		    this->chuanHoa(); // Gọi hàm chuẩn hóa để điều chỉnh thời gian
		    return temp; // Trả về giá trị trước khi tăng
		}
};

void soSanh1(Vector2Chieu v1, Vector2Chieu v2) {
    if (v1 != v2) {
        cout << "Khac nhau" << endl;
    }
    else {
        cout << "Giong nhau" << endl;
    }
}

void soSanh2(ThoiGian t1, ThoiGian t2) {
    if (t1 > t2) {
        cout << "t1 > t2" << endl;
    }
    else {
        cout << "t1 <= t2" << endl;
    }
}

int main(){
    int choice;
    do {
        cout << "Nhap case: ";
        cin >> choice;
        cout << endl;
        switch (choice) {
        	case 1: {
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
				soSanh1(v1, v2);
			    double tichvh = v1 * v2;
			    cout << endl << "Tich vo huong = " << tichvh << endl;
				cout << endl;
				v1 += v2;
				cout << "=> Vector 1: ";
				cout << v1; 
				cout << endl;
				soSanh1(v1, v2);
        		cout << endl;
				break;
			}
			case 2:{
			    ThoiGian t1, t2;
			    cout << "Nhap ThoiGian 1: ";
			    cin >> t1;
				cout << endl;
			    cout << "Nhap ThoiGian 2: ";
			    cin >> t2;
				cout << endl;
			    cout << "ThoiGian 1: " << t1 << endl;
				cout << endl;
			    cout << "ThoiGian 2: " << t2 << endl;
				cout << endl;
			    soSanh2(t1, t2);
			    t1++;
			    cout << endl << "=> ThoiGian 1: " << t1 << endl;
				cout << endl;
			    soSanh2(t1, t2);
				cout << endl;
				break;
			}
        }
    } while (choice != 0);
	return 0; 
}