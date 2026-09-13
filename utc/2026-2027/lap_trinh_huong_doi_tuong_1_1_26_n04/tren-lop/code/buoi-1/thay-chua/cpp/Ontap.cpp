#include <bits/stdc++.h>
using namespace std;

struct SinhVien {
    int ma;
    char ten[50];
    float diem;
    char truong;
};

// nhap
void nhap(int n, SinhVien *sv) {
    for (int i = 0; i < n; i++) {
        cout << "1. Nhap ma: ";
        cin >> sv[i].ma;
        cout << "Da nhap ma!\n";
        cin.ignore();
        cout << "2. Nhap ten: ";
        cin.getline(sv[i].ten, 50);
        cout << "Da nhap ten!\n";
        cout << "3. Nhap diem: ";
        cin >> sv[i].diem;
        cout << "Da nhap diem!\n";
        cout << "4. Nhap truong: ";
        cin >> sv[i].truong;
        cout << "Da nhap truong!\n";
        cin.ignore();
    }
}

void xuat(int n, SinhVien *sv) {
    for (int i = 0; i < n; i++) {
        cout << sv[i].ten << " || "
             << sv[i].ma << " || "
             << fixed << setprecision(2) << sv[i].diem << " || "
             << sv[i].truong << endl;
    }
}

int demTruong(int n, SinhVien *sv, char truong) {
    int dem = 0;
    for (int i = 0; i < n; i++) {
        if (sv[i].truong == truong)
            dem++;
    }
    return dem;
}

void truot(int n, SinhVien *sv, float dc, SinhVien *&kq, int *slTruot) {
    *slTruot = 0;
    for (int i = 0; i < n; i++) {
        if (sv[i].diem < dc) {
            kq[*slTruot] = sv[i];
            (*slTruot)++;
        }
    }
}

int main() {

    int n;
    cin >> n;
    cin.ignore();
    // Cấp phát động
    SinhVien *sv = new SinhVien[n];
    nhap(n, sv);
    xuat(n, sv);
    cout << "\nSo sv truong A: "
         << demTruong(n, sv, 'A');
    cout << "\nSo sv truong B: "
         << demTruong(n, sv, 'B');
    cout << "\nSo sv truong C: "
         << demTruong(n, sv, 'C');
    // Danh sach sinh vien truot
    SinhVien *kq = new SinhVien[n];
    int slTruot;
    truot(n, sv, 6, kq, &slTruot);
    cout << "\nCac SV bi truot la: \n";
    xuat(slTruot, kq);
    // Giải phóng bộ nhớ
    delete[] sv;
    delete[] kq;
    return 0;
}