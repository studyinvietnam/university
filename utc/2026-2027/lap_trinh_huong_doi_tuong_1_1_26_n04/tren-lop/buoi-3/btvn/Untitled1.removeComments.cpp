
#include<bits/stdc++.h>
using namespace std;

//Xây dựng lớp Phân số gồm các thuộc tính: tử số và mẫu số, các phương thức nhập, xuất, ...
//
//Viết hàm main:
//
//* Nhập vào 2 phân số, phân số thứ nhất dùng hàm tạo có đối, phân số thứ 2 dùng phương thức nhập
//* Cộng, trừ, nhân, chia 2 phân số
//* So sánh 2 phân số vừa nhập
//* Cho biết phân số tổng có lớn hơn 1 hay không
//* Nghịch đảo 1 phân số
//* Kiểm tra phân số có phải là tử lớn hơn mẫu hay không
//* Rút gọn phân số hiệu vừa tính
//* Cộng phân số tổng với 1 đơn vị

class PhanSo {
private:
    int tuso;
    int mauso;

public:
    PhanSo() {
        tuso = 0;
        mauso = 1;
    }
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
    void soSanhVoi1() {
        int tu = tuso;
        int mau = mauso;
        if (mau < 0) {
            tu = -tu;
            mau = -mau;
        }
        if (tu > mau) {
            cout << "Phan so lon hon 1 (tu > mau)" << endl;
        } else if (tu < mau) {
            cout << "Phan so nho hon 1 (tu < mau)" << endl;
        } else {
            cout << "Phan so bang 1 (tu = mau)" << endl;
        }
    }
    PhanSo tong(PhanSo ps) {
        PhanSo t;
        t.tuso = this->tuso * ps.mauso + this->mauso * ps.tuso;
        t.mauso = this->mauso * ps.mauso;
        return t;
    }
    int getTS() {
        return tuso;
    }
    int getMS() {
        return mauso;
    }
    PhanSo nghichDao() {
        if (tuso == 0) {
            cout << "Khong the nghich dao vi tu so = 0" << endl;
            return PhanSo(0, 1);
        }
        return PhanSo(mauso, tuso);
    }
};

PhanSo congPhanSo(PhanSo ps1, PhanSo ps2) {
    int ts = ps1.getTS() * ps2.getMS() + ps1.getMS() * ps2.getTS();
    int ms = ps1.getMS() * ps2.getMS();
    return PhanSo(ts, ms);
}

PhanSo truPhanSo(PhanSo ps1, PhanSo ps2) {
    int ts = ps1.getTS() * ps2.getMS() - ps1.getMS() * ps2.getTS();
    int ms = ps1.getMS() * ps2.getMS();
    return PhanSo(ts, ms);
}

PhanSo nhanPhanSo(PhanSo ps1, PhanSo ps2) {
    int ts = ps1.getTS() * ps2.getTS();
    int ms = ps1.getMS() * ps2.getMS();
    return PhanSo(ts, ms);
}

PhanSo chiaPhanSo(PhanSo ps1, PhanSo ps2) {
    int ts = ps1.getTS() * ps2.getMS();
    int ms = ps1.getMS() * ps2.getTS();
    return PhanSo(ts, ms);
}

PhanSo congPSVoi1DV(PhanSo ps1, int dv) {
    int ts = ps1.getTS() + dv * ps1.getMS();
    int ms = ps1.getMS();
    return PhanSo(ts, ms);
}

PhanSo rutGon(int ts, int ms) {
    int a = abs(ts);
    int b = abs(ms);
    while (b != 0) {
        int r = a % b;
        a = b;
        b = r;
    }
    ts = ts / a;
    ms = ms / a;
    if (ms < 0) {
        ts = -ts;
        ms = -ms;
    }
    return PhanSo(ts, ms);
}

int main() {
    PhanSo ps1(5, 7);
    PhanSo ps2;
    cout << "Phan so 1 = ";
    ps1.xuat();
    cout << endl;
    ps2.nhap();
    cout << endl << "Phan so 2 = ";
    ps2.xuat();
    PhanSo ps3 = ps1.tong(ps2);
    cout << endl << endl << "Tong (Phan so 3): ";
    ps3.xuat();
    PhanSo ps4 = congPhanSo(ps1, ps2);
    cout << endl << "Tong (ham tu do) (Phan so 4): ";
    ps4.xuat();
    PhanSo ps5 = truPhanSo(ps1, ps2);
    PhanSo ps6 = truPhanSo(ps2, ps1);
    cout << endl << endl << "Hieu ham tu do ps1-ps2 (Phan so 5): ";
    ps5.xuat();
    cout << endl << "Hieu ham tu do ps2-ps1 (Phan so 6): ";
    ps6.xuat();
    PhanSo ps[] = {ps1, ps2, ps3, ps4, ps5, ps6};
    cout << endl << endl;
    for (int i = 0; i < 6; i++) {
        if (i == 2 || i == 3) {
            cout << "=> Phan so " << i + 1 << ": ";
            ps[i].soSanhVoi1();
        }
    }
    PhanSo ps12 = ps3.nghichDao();
    cout << endl << "Nghich dao cua ps3 (Phan so 12) = ";
    ps12.xuat();
    cout << endl << endl << "=> Phan so 12: ";
    ps12.soSanhVoi1();
    PhanSo ps7 = rutGon(ps5.getTS(), ps5.getMS());
    PhanSo ps8 = rutGon(ps6.getTS(), ps6.getMS());
    cout << endl << endl << "Rut gon ham tu do ps1-ps2 (Phan so 7): ";
    ps7.xuat();
    cout << endl << "Rut gon ham tu do ps2-ps1 (Phan so 8): ";
    ps8.xuat();
    PhanSo ps9 = nhanPhanSo(ps1, ps2);
    cout << endl << endl << "Nhan ham tu do ps1*ps2 = p2*ps1 (Phan so 9): ";
    ps9.xuat();
    PhanSo ps10 = chiaPhanSo(ps1, ps2);
    PhanSo ps11 = chiaPhanSo(ps2, ps1);
    cout << endl << endl << "Chia ham tu do ps1-ps2 (Phan so 10): ";
    ps10.xuat();
    cout << endl << "Chia ham tu do ps2-ps1 (Phan so 11): ";
    ps11.xuat();
    int dv;
    cout << endl << endl << "Nhap don vi: ";
    cin >> dv;
    PhanSo ps13 = congPSVoi1DV(ps3, dv);
    PhanSo ps14 = rutGon(ps13.getTS(), ps13.getMS());
    cout << endl << "Tong phan so tong voi 1 don vi (Phan so 13) = ";
    ps14.xuat();
    return 0;
}

