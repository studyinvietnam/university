#include <bits/stdc++.h>
using namespace std;

//Viết chương trình C++ xây dựng lớp **Phân Số** gồm tử số và mẫu số. 
//Cài đặt hàm tạo mặc định, hàm tạo có tham số, phương thức nhập và xuất phân số.
//
//Xây dựng phương thức tính **tổng hai phân số**, 
//trong đó sau khi thực hiện phép cộng phải **rút gọn phân số kết quả về dạng 
//tối giản** bằng cách tìm **Ước chung lớn nhất (UCLN)** của tử số và mẫu số
// rồi chia cả hai cho UCLN.
//
//Ngoài ra, xây dựng một **hàm tự do** để tính tổng hai phân số và cũng thực hiện rút gọn kết quả. 
//Trong hàm `main`, tạo các đối tượng phân số, nhập dữ liệu và tính tổng bằng cả phương thức của lớp và hàm tự do.


class PhanSo {
private:
    int tuso;
    int mauso;
public:
    // Default constructor
    PhanSo() {
        tuso = 0;
        mauso = 1;
    }
    // Parameterized constructor
    PhanSo(int t, int m) {
        this->tuso = t;
        this->mauso = m;
    }
    void nhap() {
        cout << endl << "Nhap phan so: ";
        cin >> tuso >> mauso;
    }
    void xuat() {
        cout << endl << tuso << "/" << mauso;
    }
    PhanSo tong(PhanSo ps) {
        PhanSo t;
        t.tuso = this->tuso * ps.mauso + this->mauso * ps.tuso;
        t.mauso = this->mauso * ps.mauso;
        return t;
    }
    int getTS() { return tuso; }
    int getMS() { return mauso; }
};

// Free function version (overload, different name to avoid confusion)
PhanSo congPhanSo(PhanSo ps1, PhanSo ps2) {
    PhanSo t;
    int ts = ps1.getTS() * ps2.getMS() + ps1.getMS() * ps2.getTS();
    int ms = ps1.getMS() * ps2.getMS();
    return PhanSo(ts, ms);
}

int main() {
    PhanSo ps1(5, 7);
    PhanSo ps2;
    ps1.xuat();
    ps2.nhap();
    ps2.xuat();
    PhanSo ps3 = ps1.tong(ps2);
    cout << endl << "Tong: ";
    ps3.xuat();
    PhanSo ps4 = congPhanSo(ps1, ps2);
    cout << endl << "Tong (ham tu do): ";
    ps4.xuat();
    return 0;
}