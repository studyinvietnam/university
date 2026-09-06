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
		// Default constructor // Hàm khởi tạo mặc định
	    PhanSo() {
	        tuso = 0;
	        mauso = 1;
	    }
	    // Parameterized constructor // Hàm khởi tạo có tham số
	    PhanSo(int t, int m) {
	        this->tuso = t;
	        this->mauso = m;
	    }
	    // Hàm nhập dùng để nhập tử số và mẫu số từ bàn phím
	    // Khi gọi ps2.nhap(), chương trình sẽ yêu cầu người dùng nhập:
	    // Ví dụ: 3 4
	    // Khi đó tuso = 3 và mauso = 4
	    void nhap() {
	        cout << endl << "Nhap phan so: ";
	        cin >> tuso >> mauso;
	    }
	    // Hàm xuất dùng để in phân số ra màn hình
	    // Ví dụ: tuso = 3, mauso = 4
	    // Kết quả in ra: 3/4
	    void xuat() {
	        cout << endl << tuso << "/" << mauso;
	    }
	    //Cộng 2 phân số (cách 1)
	    // Hàm tong() là phương thức của lớp PhanSo
	    // Phân số hiện tại là phân số đứng trước dấu chấm
	    // Ví dụ: ps1.tong(ps2)
	    // => this chính là ps1
	    // => ps chính là ps2
	    //
	    // Công thức cộng:
	    // a/b + c/d = (a*d + b*c)/(b*d)
	    PhanSo tong(PhanSo ps) {
	        // Tạo một phân số t bằng hàm tạo mặc định
	        // Ban đầu t = 0/1
	        PhanSo t;
	        // Tính tử số của phân số tổng
	        // Tử = tử1 * mẫu2 + mẫu1 * tử2
	        t.tuso = this->tuso * ps.mauso + this->mauso * ps.tuso;
	        // Tính mẫu số của phân số tổng
	        // Mẫu = mẫu1 * mẫu2
	        t.mauso = this->mauso * ps.mauso;
	        // Trả về phân số tổng
	        return t;
	    }
	    // Hàm getTS() dùng để lấy giá trị tử số
	    // Vì tuso là private nên hàm bên ngoài lớp không thể truy cập trực tiếp
	    int getTS() {
	    	return tuso;
		}
	    // Hàm getMS() dùng để lấy giá trị mẫu số
	    // Vì mauso là private nên hàm bên ngoài lớp không thể truy cập trực tiếp
	    int getMS() {
	    	return mauso;
		}
};




// Free function version (overload, different name to avoid confusion) // Phiên bản hàm tự do (nạp chồng, tên khác để tránh nhầm lẫn)
// Cộng 2 phân số (cách 2 cộng hàm tự do)
//
// Đây là hàm tự do, không nằm bên trong lớp PhanSo.
// Vì hàm này nằm ngoài lớp nên không thể truy cập trực tiếp:
// ps1.tuso hoặc ps1.mauso
//
// Do đó phải sử dụng hàm getTS() và getMS() để lấy tử số, mẫu số.
PhanSo congPhanSo(PhanSo ps1, PhanSo ps2) {
    // Tạo biến ts để lưu tử số của kết quả
    int ts = ps1.getTS() * ps2.getMS() + ps1.getMS() * ps2.getTS();
    // Tạo biến ms để lưu mẫu số của kết quả
    int ms = ps1.getMS() * ps2.getMS();
    // Tạo và trả về một phân số mới có tử số ts và mẫu số ms
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



// Hàm rút gọn phân số
// Hàm nhận vào:
// ts: tử số
// ms: mẫu số
// Sau khi rút gọn sẽ trả về một PhanSo mới
PhanSo rutGon(int ts, int ms) {
	// Ví dụ:
	// ts = 9
	// ms = 18
	// Lấy giá trị tuyệt đối của tử số
	// a = |9| = 9
	int a = abs(ts);
	// Lấy giá trị tuyệt đối của mẫu số
	// b = |18| = 18
	int b = abs(ms);
	// Tìm ƯCLN bằng thuật toán Euclid
	//
	// Ý tưởng:
	// Lấy số lớn chia số nhỏ, lấy phần dư.
	// Sau đó lấy số nhỏ chia cho phần dư.
	// Lặp lại cho đến khi phần dư bằng 0.
	while (b != 0) {
		// Lần 1:
		// a = 9
		// b = 18
		//
		// r = 9 % 18 = 9
		int r = a % b;
		// a nhận giá trị của b
		// a = 18
		a = b;
		// b nhận giá trị của phần dư
		// b = 9
		b = r;
		// Lần 2:
		// a = 18
		// b = 9
		//
		// r = 18 % 9 = 0
		//
		// a = 9
		// b = 0
		//
		// b = 0 nên vòng while kết thúc.
	}
	// Sau vòng while:
	// a = 9
	//
	// Vì a là ƯCLN của 9 và 18
	// nên ƯCLN = 9
	// Chia tử số cho ƯCLN
	// ts = 9 / 9 = 1
	ts = ts / a;
	// Chia mẫu số cho ƯCLN
	// ms = 18 / 9 = 2
	ms = ms / a;
	// Sau khi chia:
	// ts = 1
	// ms = 2
	//
	// Phân số:
	// 1/2
	// Nếu mẫu số âm thì chuyển dấu âm lên tử số
	//
	// Ví dụ:
	// Nếu kết quả là 1/-2
	// thì đổi thành -1/2
	if (ms < 0) {
		// Đổi dấu tử số
		ts = -ts;
		// Đổi dấu mẫu số
		ms = -ms;
	}
	// Tạo một đối tượng PhanSo mới
	// với:
	// tử số = ts
	// mẫu số = ms
	//
	// Ví dụ:
	// return PhanSo(1, 2);
	//
	// Kết quả trả về:
	// 1/2
	return PhanSo(ts, ms);
}




int main(){
    // ==========================================
    // BƯỚC 1: TẠO PHÂN SỐ THỨ NHẤT
    // ==========================================
    // Phân số thứ nhất được tạo bằng hàm tạo có tham số
    //
    // PhanSo(5, 7)
    // => tuso = 5
    // => mauso = 7
    //
    // Vì vậy:
    // ps1 = 5/7
    PhanSo ps1(5, 7);
    // ==========================================
    // BƯỚC 2: TẠO PHÂN SỐ THỨ HAI
    // ==========================================
    // Phân số thứ hai được tạo bằng hàm tạo mặc định
    //
    // Hàm tạo mặc định:
    // tuso = 0
    // mauso = 1
    //
    // Ban đầu:
    // ps2 = 0/1
    PhanSo ps2;
    // ==========================================
    // BƯỚC 3: XUẤT PHÂN SỐ THỨ NHẤT
    // ==========================================
    // Gọi hàm xuat() để in ps1
    //
    // Kết quả:
    // 5/7
    ps1.xuat();
    // ==========================================
    // BƯỚC 4: NHẬP PHÂN SỐ THỨ HAI
    // ==========================================

    // Gọi phương thức nhap() để người dùng nhập
    // tử số và mẫu số cho ps2
    //
    // Ví dụ nhập:
    // 3 4
    //
    // Sau khi nhập:
    // ps2 = 3/4
    ps2.nhap();
    // ==========================================
    // BƯỚC 5: XUẤT PHÂN SỐ THỨ HAI
    // ==========================================
    // In phân số ps2 vừa nhập
    ps2.xuat();
    // ==========================================
    // BƯỚC 6: CỘNG 2 PHÂN SỐ - CÁCH 1
    // ==========================================

    // Gọi phương thức tong() của ps1
    //
    // ps1.tong(ps2)
    //
    // Nghĩa là:
    // ps1 + ps2
    //
    // Nếu:
    // ps1 = 5/7
    // ps2 = 3/4
    //
    // Công thức:
    // 5/7 + 3/4
    // = (5*4 + 7*3)/(7*4)
    // = (20 + 21)/28
    // = 41/28
    PhanSo ps3 = ps1.tong(ps2);
    // In kết quả tổng
    cout << endl << "Tong: ";
    ps3.xuat();
    // ==========================================
    // BƯỚC 7: CỘNG 2 PHÂN SỐ - CÁCH 2
    // ==========================================
    // Sử dụng hàm tự do congPhanSo()
    //
    // Hàm này nằm ngoài lớp PhanSo.
    //
    // congPhanSo(ps1, ps2)
    // => lấy ps1 và ps2 làm tham số
    // => tính tổng
    // => trả về một đối tượng PhanSo
    PhanSo ps4 = congPhanSo(ps1, ps2);
    // In kết quả tổng bằng hàm tự do
    cout << endl << "Tong (ham tu do): ";
    ps4.xuat();
    // ==========================================
    // BƯỚC 8: TRỪ 2 PHÂN SỐ
    // ==========================================
    PhanSo ps5 = truPhanSo(ps1, ps2);
    PhanSo ps6 = truPhanSo(ps2, ps1);
    // In kết quả tổng bằng hàm tự do
    cout << endl << "Hieu ham tu do ps1-ps2: ";
    ps5.xuat();
    cout << endl << "Hieu ham tu do ps2-ps1: ";
    ps6.xuat();
    // ==========================================
    // BƯỚC 9: RÚT GỌN TRỪ 2 PHÂN SỐ
    // ==========================================
    PhanSo ps7 = rutGon(ps5.getTS(), ps5.getMS());
    PhanSo ps8 = rutGon(ps6.getTS(), ps6.getMS());
    // In kết quả tổng bằng hàm tự do
    cout << endl << "Rut gon ham tu do ps1-ps2: ";
    ps7.xuat();
    cout << endl << "Rut gon ham tu do ps2-ps1: ";
    ps8.xuat();
    // ==========================================
    // BƯỚC 10: NHÂN 2 PHÂN SỐ
    // ==========================================
    PhanSo ps9 = nhanPhanSo(ps1, ps2);
    // In kết quả tổng bằng hàm tự do
    cout << endl << "Nhan ham tu do ps1*ps2 = p2*ps1: ";
    ps9.xuat();
    // ==========================================
    // BƯỚC 11: CHIA 2 PHÂN SỐ
    // ==========================================
    PhanSo ps10 = chiaPhanSo(ps1, ps2);
    PhanSo ps11 = chiaPhanSo(ps2, ps1);
    // In kết quả tổng bằng hàm tự do
    cout << endl << "Hieu ham tu do ps1-ps2: ";
    ps10.xuat();
    cout << endl << "Hieu ham tu do ps2-ps1: ";
    ps11.xuat();
    
    
    
    // ==========================================
    // KẾT THÚC CHƯƠNG TRÌNH
    // ==========================================
    // return 0 có nghĩa là chương trình kết thúc bình thường
    return 0;
}