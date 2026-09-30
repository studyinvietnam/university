#include<bits/stdc++.h>

using namespace std;
using ll = long long;

class DayThuc{
	private:
		int n;
		double *a;
	public:
		DayThuc() {
		    n = 0;
		    a = NULL;
		}
		/*
		Nạp chồng toán tử nhập (Friend Function)
		*/
		friend istream& operator >>(istream &is, DayThuc &dt) {
	        cout << "\nNhap so phan tu: ";
	        is >> dt.n;
	        cout << endl;
	        dt.a = new double[dt.n + 1]; // Cấp phát bộ nhớ cho mảng dựa vào n đã nhập
	        for (int i = 0; i < dt.n; i++) {
	            cout << "Nhap he so cua phan tu " << i << ": ";
	            is >> dt.a[i];
	        }
	        cout << endl;
	        return is;
	    }
		/*
		Nạp chồng toán tử xuất (Friend Function)
		*/
	    friend ostream& operator << (ostream &os, DayThuc dt){
	    	os << "\n--Gia tri luu duoc--" << endl;
	        for (int i = 0; i < dt.n; i++) {
	            os << "Phan tu " << i << ": ";
	            os << dt.a[i] << endl;
	        }
	        os << endl;
        	return os;
		}
	    double operator +() const {
	        double ketQua = 0; 
	        for(int i = 0; i < n; i++){
	        	ketQua += a[i];
			}
	        return ketQua; 
	    }
		bool operator>(DayThuc &dt) const {
		    // (*) Lúc này:
		    //     - this      = &dt1   (con trỏ tới đối tượng đang gọi)
		    //     - *this     = dt1    (chính đối tượng bên trái dấu >)
		    //     - dt        = dt2    (đối tượng bên phải dấu >)
		
		    // (**) +(*this)  --> gọi toán tử + một ngôi trên dt1
		    //      tức là chạy: double operator+() const { ... }
		    //      bên trong hàm đó: cộng dồn các phần tử a[i] của dt1
		    //      Kết quả ví dụ Test 1: 1.5 + 2.5 + 3.0 = 7.0
		
		    // (***) +dt  --> gọi toán tử + một ngôi trên dt2
		    //       Kết quả ví dụ Test 1: 2.0 + 3.0 = 5.0
		
		    // (****) Sau đó so sánh hai double bằng toán tử > có sẵn của C++
		    //        return 7.0 > 5.0;  --> trả về true
		
		    return +(*this) > +dt;
		}
		~DayThuc() {
		    delete[] a; // Xóa vùng nhớ đã cấp phát cho mảng a
		}
};

int main() {
    DayThuc dt1, dt2;
    cout << "=== Nhap day 1 ===" << endl;
    cin >> dt1;
    cout << "=== Nhap day 2 ===" << endl;
    cin >> dt2;
    cout << "\n=== Day 1 ===";
    cout << dt1;
    cout << "\n=== Day 2 ===";
    cout << dt2;
    // Gọi toán tử >
    if (dt1 > dt2) {
        cout << "\n-> Tong day 1 LON HON tong day 2" << endl;
    } else if (dt2 > dt1) {
        cout << "\n-> Tong day 2 LON HON tong day 1" << endl;
    } else {
        cout << "\n-> Hai day co tong BANG NHAU" << endl;
    }
    // In ra tổng để kiểm chứng
    cout << "\nTong day 1 = " << +dt1 << endl;
    cout << "Tong day 2 = " << +dt2 << endl;
    return 0;
}