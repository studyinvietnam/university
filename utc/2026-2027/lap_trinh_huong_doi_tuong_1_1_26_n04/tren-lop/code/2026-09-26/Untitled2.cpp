#include <bits/stdc++.h>
using namespace std;
using ll = long long;

/* ==================== CLASS CTY ==================== */
class CTY {
private:
    string ma;
    string ten;
    int nam;
    int sonv;
public:
    // Khởi tạo
    CTY() {
        ma   = "";
        ten  = "";
        nam  = 0;
        sonv = 0;
    }

    // Nạp chồng toán tử nhập (Friend Function)
    friend istream& operator>>(istream &is, CTY &cpn) {
        cout << "  Nhap ma cong ty: ";
        is >> ws;
        getline(is, cpn.ma);
        cout << "  Nhap ten cong ty: ";
        getline(is, cpn.ten);
        cout << "  Nhap nam thanh lap: ";
        is >> cpn.nam;
        cout << "  Nhap so nhan vien: ";
        is >> cpn.sonv;
        return is;
    }

    // Nạp chồng toán tử xuất (Friend Function)
    friend ostream& operator<<(ostream &os, const CTY &cpn) {
        os << "  Ma cong ty: "    << cpn.ma   << endl;
        os << "  Ten cong ty: "   << cpn.ten  << endl;
        os << "  Nam thanh lap: " << cpn.nam  << endl;
        os << "  So nhan vien: "  << cpn.sonv << endl;
        return os;
    }

    // Getter
    int getNam()  const { return nam;  }
    int getSoNV() const { return sonv; }
};

/* ============ HÀM TỰ DO – CÙNG CẤP VỚI main ============ */

// Tìm năm thành lập nhỏ nhất
int namNhoNhat(CTY a[], int n) {
    if (n == 0) return -1;
    int minNam = a[0].getNam();
    for (int i = 1; i < n; i++) {
        if (a[i].getNam() < minNam)
            minNam = a[i].getNam();
    }
    return minNam;
}

// Sắp xếp: NV nhiều hơn lên trước; nếu bằng NV thì năm nhỏ hơn lên trước
void sapXep(CTY a[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = i + 1; j < n; j++) {
            bool doi = false;
            if (a[j].getSoNV() > a[i].getSoNV()) {
                doi = true;                              // nhiều NV hơn → đổi
            }
            else if (a[j].getSoNV() == a[i].getSoNV()) {
                if (a[j].getNam() < a[i].getNam())
                    doi = true;                          // cùng NV, sớm hơn → đổi
            }
            if (doi) {
                CTY temp = a[i];
                a[i]     = a[j];
                a[j]     = temp;
            }
        }
    }
}

/* ==================== MAIN ==================== */
int main() {
    int n;
    cout << "Nhap so luong cong ty: ";
    cin >> n;
    // Khai báo mảng CTY (thay cho DayCTY)
    CTY *a = new CTY[n];
    // Nhập từng công ty
    for (int i = 0; i < n; i++) {
        cout << "\nNhap thong tin cua cong ty thu " << i << ":\n";
        cin >> a[i];
    }
    // Xuất danh sách
    cout << "\n-- Danh sach cong ty --\n";
    for (int i = 0; i < n; i++) {
        cout << "Cong ty thu " << i << ":\n";
        cout << a[i] << endl;
    }
    // Tìm năm nhỏ nhất
    cout << "\nNam thanh lap nho nhat: " << namNhoNhat(a, n) << endl;
    // Sắp xếp
    sapXep(a, n);
    cout << "\n-- Sau khi sap xep --\n";
    for (int i = 0; i < n; i++) {
        cout << "Cong ty thu " << i << ":\n";
        cout << a[i] << endl;
    }
    delete[] a;   // giải phóng bộ nhớ
    return 0;
}