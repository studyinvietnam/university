 #include "SinhVien.h"


void nhap(SinhVien sv[], int &n) {
	ifstream file;
    file.open("input.txt");
    file >> n;
    file.ignore(); // Ignore the newline character after the number of students

    for (int i = 0; i < n; i++) {
        file >> sv[i].MSV;
        file.ignore(); // Ignore the newline character after MSV
        file.getline(sv[i].hoTen, 100);
        file >> sv[i].diem;
        file.ignore(); // Ignore the newline character after diem
        file.getline(sv[i].truong, 100);
    }
    file.close();
}

void xuat(SinhVien sv[], int n) {
    cout << "Danh sach sinh vien: " << endl;
    for (int i = 0; i < n; i++) {
        cout << "MSV: " << sv[i].MSV << " - " << "Ho ten: " << sv[i].hoTen << " - " << "Diem: " << fixed << setprecision(2) << sv[i].diem << " - " << "Truong: " << sv[i].truong << endl;
    }
    cout << endl;
}




void thongKeSinhVien(struct SinhVien sv[], int n){
    int soluongTruongA = 0, soluongTruongB = 0, soluongTruongC = 0;
    for(int i = 0; i < n; i++){
        if(strcmp(sv[i].truong, "TruongA") == 0){
            soluongTruongA++;
        }
        else if(strcmp(sv[i].truong, "TruongB") == 0){
            soluongTruongB++;
        }
        else if(strcmp(sv[i].truong, "TruongC") == 0){
            soluongTruongC++;
        }
    }
    cout << "So luong sinh vien o Truong A: " << soluongTruongA << endl;
    cout << "So luong sinh vien o Truong B: " << soluongTruongB << endl;
    cout << "So luong sinh vien o Truong C: " << soluongTruongC << endl;
    cout << endl;
    int maxTruong = max(soluongTruongA, max(soluongTruongB, soluongTruongC));
    cout << "Truong co nhieu sinh vien nhat: " << maxTruong << " - Truong: ";
    if(maxTruong == soluongTruongA){
        cout << "TruongA";
    }
    else if(maxTruong == soluongTruongB){
        cout << "TruongB";
    }
    else{
        cout << "TruongC";
    }
    cout << endl;
    cout << endl;
}

void danhSachSinhVienBiTruot(struct SinhVien sv[], int n){
    double diemChuan;
    cout << "Nhap diem chuan: ";
    cin >> diemChuan;
    cout << "Danh sach sinh vien bi truot: " << endl;
    for(int i = 0; i < n; i++){
        if(sv[i].diem < diemChuan){
            cout << sv[i].hoTen << " - " << "Diem: " << fixed << setprecision(2) << sv[i].diem << endl;
        }
    }
    cout << endl;
}

int main(){
    struct SinhVien sv[100];
    int n;
    nhap(sv, n);
    xuat(sv, n);
    thongKeSinhVien(sv, n);
    danhSachSinhVienBiTruot(sv, n);
    return 0;
}