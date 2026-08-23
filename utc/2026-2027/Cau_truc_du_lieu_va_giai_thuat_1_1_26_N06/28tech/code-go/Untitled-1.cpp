#include <bits/stdc++.h>
using namespace std;
using ll = long long;

vector<int> cnt(1000001); // mảng đếm/đánh dấu dùng chung, index 0 -> 10^6

int main() {
	// ================= pair: kieu du lieu ==========================
	{
		int n; cin >> n;
		pair<int, int> a[n];
		for(int i = 0; i < n; i++) {
			cin >> a[i].first >> a[i].second;
		}
	}
	cout << endl;
	{
//		pair<int, int> p = make_pair(100, 200);
		pair<int, int> p = {100, 200};
		//first second
//		p.first = 100;
//		p.second = 200; // (100, 200)
		cout << p.first << ' ' << p.second << endl;
	}
	cout << endl;
	// ================= DẠNG 1: ITERATOR CỦA VECTOR =================
	{
		vector<int> v = {1, 2, 3, 4, 5};
		vector<int>::iterator it; // iterator: bộ lặp
		// Cách 1
		cout << "Cach 1: ";
		for(auto x : v) {
		    cout << x << " ";
		}
		cout << endl << endl;
		// Cách 2
		cout << "Cach 2: ";
		for (auto it = v.begin(); it != v.end(); it++) {
    		cout << *it << ' ';
		}
		cout << endl << endl;
		// Cách 3
		cout << "Cach 3: ";
		for(it = v.begin(); it != v.end(); it++){
			cout << *it << ' ';
		}
		cout << endl << endl;
		it = v.begin();
		cout << *it << endl; // giai tham chieu: dereference -> 1
		++it;
		cout << *it << endl; // 2
		--it;
		cout << *it << endl; // 1
		it = v.begin() + 3;
		cout << *it << endl;
//		v.erase(v.begin() + 2); // xóa phần tử ở chỉ số 2
//		Ví dụ OUTPUT: 1 2 3 4 5 => 1 2 4 5
//		v.pop_back(); Chức năng: Xóa phần tử cuối cùng trong vector
//		Ví dụ OUTPUT: 1 2 3 4 5 => 1 2 3 4
		//push_back size insert pop_back erase
		//clear, empty, emplace_back, assign, resize
	}
	cout << endl;
	// ================= DẠNG 2: NHẬP/XUẤT VECTOR VỚI n PHẦN TỬ =================
	{
		int n;
		cin >> n; // Nhập số lượng phần tử n TRƯỚC khi tạo vector
		vector<int> v(n);
		for (int i = 0; i < n; i++) {
			cin >> v[i]; // vd: 1 4 1 2 45
		}
		for (int i = 0; i < n; i++) {
			cout << v[i] << ' ';
		}
		cout << endl;
	}
	cout << endl;
	// ================= DẠNG 3: PUSH_BACK VÀO VECTOR RỖNG =================
	{
		vector<int> v; // vector rỗng, KHÔNG truyền n
		v.push_back(100); // {100}
		v.push_back(200); // {100, 200}
		v.push_back(300); // {100, 200, 300}
		v.push_back(400); // {100, 200, 300, 400}
		cout << v.size() << endl;
		for (size_t i = 0; i < v.size(); i++) {
			cout << v[i] << ' ';
		}
		cout << endl;
		for (int x : v) {
			cout << x << ' ';
		}
		cout << endl;
	}
	cout << endl;
	// ================= DẠNG 4: ĐẾM TẦN SUẤT XUẤT HIỆN =================
	{
		int n;
		cin >> n;
		vector<int> a(n);
		for (int i = 0; i < n; i++) cin >> a[i];

		for (int i = 0; i < n; i++) {
			cnt[a[i]]++; // tăng tần suất của a[i]
		}
		for (int i = 0; i <= 100000; i++) {
			if (cnt[i] != 0) {
				cout << i << ' ' << cnt[i] << endl;
			}
		}

		// reset lại cnt để dùng sạch cho các dạng sau
		for (int i = 0; i < n; i++) cnt[a[i]] = 0;
	}
	cout << endl;
	// ================= DẠNG 5: ĐẾM SỐ LƯỢNG GIÁ TRỊ PHÂN BIỆT =================
	{
		int n;
		cin >> n;
		vector<int> a(n);
		int max_val = -1e9;
		for (int i = 0; i < n; i++) {
			cin >> a[i];
			max_val = max(max_val, a[i]);
		}
		for (int i = 0; i < n; i++) {
			cnt[a[i]] = 1; // đánh dấu sự xuất hiện của a[i]
		}
		int dem = 0;
		for (int i = 0; i <= 1000000; i++) {
			if (cnt[i] == 1) ++dem;
		}
		cout << dem << endl;

		// reset lại cnt
		for (int i = 0; i < n; i++) cnt[a[i]] = 0;
	}
	cout << endl;
	// ================= DẠNG 6: LIỆT KÊ PHẦN TỬ "XUẤT HIỆN LẦN ĐẦU" (O(n^2)) =================
	// Ví dụ: 1 2 3 4 1 2 3 4 5 (n = 9) -> chỉ in: 1 2 3 4 5
	{
		int n;
		cin >> n;
		vector<int> a(n);
		for (int &x : a) cin >> x;

		for (int i = 0; i < n; i++) {
			bool check = true;
			for (int j = 0; j < i; j++) {
				if (a[i] == a[j]) {
					check = false;
					break;
				}
			}
			if (check) cout << a[i] << " ";
		}
		cout << endl;
	}
	cout << endl;
	// ================= DẠNG 7: KHOẢNG CÁCH NHỎ NHẤT GIỮA 2 PHẦN TỬ (O(n^2)) =================
	// Ví dụ: 1 2 3 1 2 (n = 5)
	{
		int n;
		cin >> n;
		vector<int> a(n);
		for (int &x : a) cin >> x;
		int res = INT_MAX;
		for (int i = 0; i < n; i++) {
			for (int j = i + 1; j < n; j++) {
				if (abs(a[i] - a[j]) < res) {
					res = abs(a[i] - a[j]);
				}
			}
		}
		cout << res << endl;
	}
	cout << endl;
	// ================= DẠNG 8: LIỆT KÊ TẤT CẢ CÁC CẶP (i, j) VỚI i < j (O(n^2)) =================
	{
		int n;
		cin >> n;
		vector<int> a(n);
		for (int &x : a) cin >> x;

		for (int i = 0; i < n; i++) {
			for (int j = i + 1; j < n; j++) {
				cout << a[i] << " " << a[j] << endl;
			}
		}
	}
	cout << endl;
	// ================= DẠNG 9: RANGE-BASED FOR LOOP =================
	{
		int n;
		cin >> n;
		vector<int> a(n);
		for (int &x : a) cin >> x;
		cout << "Ban dau: ";
		for (int i = 0; i < n; i++) cout << a[i] << ' ';
		cout << endl;
		// Đọc bằng giá trị (copy) -> không sửa được a
		cout << "Range-based for (doc, khong sua duoc a): ";
		for (int x : a) {
			cout << x << ' ';
		}
		cout << endl;
		// Đọc/ghi bằng tham chiếu -> sửa trực tiếp các phần tử trong a
		cout << "Range-based for (&x, gan tat ca = 100): " << endl;
		for (int &x : a) {
			x = 100;
		}
		for (int i = 0; i < n; i++) {
			cout << a[i] << ' ';
		}
		cout << endl;
	}
	return 0;
}