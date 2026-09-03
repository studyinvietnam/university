#include <bits/stdc++.h>
using namespace std;
using ll = long long;

bool cmp_min_to_max(int x, int y){
	return x < y;
}

bool cmp_abs_min_to_max(int x, int y){
	return abs(x) < abs(y);
}

bool cmp_max_to_min(int x, int y){
	return x > y;
}

int tong2(int n){
	int sum = 0;
	while(n != 0){
		sum += n % 10;
		n /= 10;
	}
	return sum;
}

bool cmp_tong_min_to_max(int x, int y){
	if(tong2(x) != tong2(y)){
		return tong2(x) < tong2(y);
	} else {
		return x > y;
	}
}

int le5(int n) {
	int dem = 0;
	while(n != 0) {
		if(n % 2 == 1){
			++dem;
		}
		n/= 10;
	}
	return dem;
}
//Sắp xếp cho tống chữ số tăng dần, nếu 2 số có cũng tống chữ số thì số
// nhỏ hơn sẽ đứng trước
bool cmp_le_max_to_min(int x, int y){
	if(le5(x) != le5(y)){
		return le5(x) > le5(y);
	}
	else
		return x < y;
}

/*== [Comparator Lower_bound Upper_bound]. Bài 7. Sắp xếp 0, 6, 8 ==*/
int count6(int n){
	if(n == 0){
		return 1;
	}
	int dem = 0;
	while(n != 0) {
		int r = n % 10;
		if(r == 0 || r == 6|| r == 8){
			++dem;
		}
		n/= 10;
	}
	return dem;
}
bool cmp_count6_max_to_min(int x, int y){
	if(count6(x) != count6(y)){
		return count6(x) > count6(y);
	}
	else{
		return x < y;
	}
}

/*== [Comparator Lower_bound Upper_bound]. Bài 4. Pair sort ==*/
typedef pair<int, int> ii;
#define fi first
#define se second
bool cmp_pair_min_to_max(ii x, ii y){
	int kc1 = x.fi * x.fi + x.se * x.se;
	int kc2 = y.fi * y.fi + y.se * y.se;
	if(kc1 != kc2){
		return kc1 < kc2;
	}
	if(x.fi != y.fi){
		return x.fi < y.fi;
	}
	return x.se < y.se;
}
/*== [Comparator Lower_bound Upper_bound]. Bài 9. Sắp xếp theo second, first ==*/
bool cmp_bai9(ii x, ii y){
	if(x.se != y.se){
		return x.se < y.se;
	}
	return x.fi > y.fi;
}

/*== [Comparator Lower_bound Upper_bound]. Bài 5. Pair sort 2 ==*/
//typedef pair<int, int> ii;
typedef pair<int, pair<int, int>> iii;
//#define fi first
//#define se second
// //pair<int, pair<int, int>>
bool cmp_pair2_min_to_max(iii x, iii y){
	if(x.fi != y.fi){
		return x.fi < y.fi;
	}
	if(x.se.fi != y.se.fi){
		return x.se.fi < y.se.fi;
	}
	return x.se.se < y.se.se;
}

/*== [Comparator Lower_bound Upper_bound]. Bài 10. Sắp xếp pair 2 ==*/
bool cmp_bai10(ii x, ii y){
	if(abs(x.fi - x.se) != abs(y.fi - y.se)){
		return abs(x.fi - x.se) < abs(y.fi - y.se);
	}
	if(x.fi != y.fi){
		return x.fi < y.fi;
	}
	return x.se > y.se;
}

/*== [Comparator Lower_bound Upper_bound]. Bài 8. Sắp xếp chữ số nguyên tố ==*/
int tong_bai8(int n){
	int sum = 0;
	while(n != 0){
		int r = n % 10;
		if(r == 2 || r == 3||r == 5|| r == 7){
			++sum;
		}
		n /= 10;
	}
	return sum;
}
bool cmp_bai8(int x, int y){
	return tong_bai8(x) > tong_bai8(y);
}

/*== [Comparator Lower_bound Upper_bound]. Bài 1. Comparison function ==*/
int chan_bai1(int n){
	int sum = 0;
	if (n < 0) n = -n;
	while(n != 0){
		int r = n % 10;
		if(r % 2 == 0){
			++sum;
		}
		n/= 10;
	}
	return sum;
}
int le_bai1(int n){
	int sum = 0;
	while(n != 0){
		int r = n % 10;
		if(r % 2 == 1){
			++sum;
		}
		n/= 10;
	}
	return sum;
}
bool cmp1_bai1(int x, int y){
	if(chan_bai1(x) != chan_bai1(y)){
		return chan_bai1(x) < chan_bai1(y);
	}
	else{
		return x < y;
	}
}
bool cmp2_bai1(int x, int y){
	return le_bai1(x) < le_bai1(y);
}

/*== [Comparator Lower_bound Upper_bound]. Bài 2. Sắp xếp theo trị tuyệt đối ==*/
int X;
bool cmp1_bai2(int x, int y){
	if(abs(x - X) != abs(y - X)){
		return abs(x - X) < abs(y - X);
	}
	return x < y;
}
bool cmp2_bai2(int x, int y){
	//chan truoc, le sau, chan tang, le giam
	int r1 = x % 2, r2 = y % 2;
	if(r1 == 0 && r2 == 0){
		return x < y;
	}
	if(r1 == 1 && r2 == 1){
		return x > y;
	}
	if(r1 == 0 && r2 == 1){
		return true;
	}
	return false;
}

/*== 2. Tìm kiếm nhị phân (Binary Search): ==*/
bool bs_case13(int a[], int l, int r, int x){
	while(l <= r){
		int m = (l+r) / 2;
		if(a[m] == x){
			return true;
		}
		else if(a[m] < x) {
			l = m + 1;
		}
        else {                 
            r = m - 1;         
        }
	}
	return false;
}

/*== [Comparator Lower bound Upper bound]. Bài 11. First position ==*/
int firstPos(int a[], int l, int r, int x){
	int res = -1; 
	while(l <= r){ 
		int m = (l + r) / 2; 
		if(a[m] == x){ 
			res = m; // ghi nhận vị trí tìm thấy 
			r = m - 1; // tiếp tục tìm về bên trái 
		} 
		else if(a[m] < x){ 
			l = m + 1; // x nằm bên phải 
		} 
		else{ 
			r = m - 1; // x nằm bên trái 
		} 
	} 
	return res; 
}

/*== [Comparator Lower_bound Upper_bound]. Bài 12. Last position ==*/
int lastPos(int a[], int l, int r, int x){
	int res = -1; 
	while(l <= r){ 
		int m = (l + r) / 2; 
		if(a[m] == x){ 
			res = m; // ghi nhận vị trí tìm thấy 
			l = m + 1; // tiếp tục tìm về bên trái 
		} 
		else if(a[m] < x){ 
			l = m + 1; // x nằm bên phải 
		} 
		else{ 
			r = m - 1; // x nằm bên trái 
		} 
	} 
	return res; 
}


int main(){
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int chon;
    cout << "Vui long chon case: " << flush;
    cin >> chon;
    cout << endl;
    switch(chon){
    	case 1:{
    		//sort: mang, vector, string
			// a + 1: con tro tro den thang a[i]
			//sort(a, a+n)
			//sort(a+x, a+y+1)
			//sort(v.begin(), v.end())
			//sort(v.begin()+x, v.begin()+y+1)
			int a[] = {3, 1, 2, 1, 2, 12, 7, 9, 10, 8};
			int n = 10;
			sort(a, a + n); // tang dan
			for(int x: a) cout << x << " ";
			cout << endl;
			sort(a, a + n, greater<int>()); //giam dan // tim sort = quick sort + heap sort : O(NlogN)
			for(int x: a) cout << x << " ";
			break;
		}
		case 2:{
			int n; cin >> n; // 6
			char a[n]; // string a[n]
			for(int i=0; i < n; i++) cin >> a[i]; // 2 8 t e c h
			sort(a, a + n);
			for(char x: a) cout << x << " "; // for(string x: a)
			cout << endl;
			sort(a, a + n, greater<char>()); // sort(a, a + n, greater<string>())
			for(char x: a) cout << x << " "; // for(string x: a)
			break;
		}
		case 3:{
			int n; cin >> n; // 4
			string a[n]; 
			for(int i=0; i < n; i++) cin >> a[i]; // 28tech dsa cpp python
			cout << endl;
			sort(a, a + n);
			for(string x: a) cout << x << " ";
			cout << endl;
			sort(a, a + n, greater<string>());
			for(string x: a) cout << x << " ";
			break;
		}
		case 4:{
			//comparison function
			//true: Nêu x đứng trước y sau khi sắp xếp => true
			//false Néu x đứng sau y sau khi sắp xếp => false
			//B1: Mình muốn sắp xếp máng ntn?
			//B2: Nếu x muốn đứng trước y theo thứ tự sắp xếp đó thì mình sẽ cần điều kiện gì
			//và nếu điều kiện đó thỏa mãn => return true
			int a[] = {3, 1, 2, 1, 2, 12, 7, 9, 10, 8};
			int n = 10;
			sort(a, a + n, cmp_min_to_max); //
			for(int x: a) cout << x << " ";
			cout << endl;
			sort(a, a + n, cmp_max_to_min); //
			for(int x: a) cout << x << " ";
			cout << endl;
			int a1[] = {3, 1, -2, 1, -2, 12, -7, 9, -10, 8};
			sort(a1, a1 + n, cmp_abs_min_to_max); //
			for(int x: a1) cout << x << " ";
			cout << endl;
			int a2[] = {888, 1000002, 34, 9000, 3330, 600021, 12, 40012};
			int n2 = 8;
//			sort(a2, a2 + n2, cmp_tong_min_to_max); //
			stable_sort(a2, a2 + n2, cmp_tong_min_to_max); // merge sort
			for(int x: a2) cout << x << " ";
			cout << endl;
			break;
		}
		case 5:{
			/*== [Comparator Lower_bound Upper_bound]. Bài 6. Sắp xếp lẻ ==*/
			int n; cin >> n; // 11
			int a[n];
			for(int i = 0; i < n; i++){
				cin >> a[i];
			} // 4456 10493 23600 32757 6911 15236 14074 22458 32132 28596 15209
			cout << endl;
			sort(a, a + n, cmp_le_max_to_min); //
			for(int x: a) cout << x << " ";
			break;
		}
		case 6:{
			/*== [Comparator Lower_bound Upper_bound]. Bài 7. Sắp xếp 0, 6, 8 ==*/
			int n; cin >> n; // 14
			int a[n];
			for(int i = 0; i < n; i++){
				cin >> a[i];
			} // 25556 23648 11105 26441 32129 28433 8765 23517 25187 22479 20475 21283 5842 4471
			cout << endl;
			sort(a, a + n, cmp_count6_max_to_min); //
			for(int x: a) cout << x << " ";
			break;
		}
		case 7:{
			/*== [Comparator Lower_bound Upper_bound]. Bài 4. Pair sort ==*/
			freopen("Untitled4_input7.txt", "r", stdin);
			int n; cin >> n;
			ii a[n];
			for(int i = 0; i < n; i++) cin >> a[i].fi >> a[i].se;
			sort(a, a + n, cmp_pair_min_to_max);
			for(ii x: a) cout << x.fi << " " << x.se << endl;
			cout << endl;
			/*== [Comparator Lower_bound Upper_bound]. Bài 9. Sắp xếp theo second, first ==*/
			sort(a, a + n, cmp_bai9);
			for(ii x: a) cout << x.fi << " " << x.se << endl;
			cout << endl;
			break;
		}
		case 8:{
			/*== [Comparator Lower_bound Upper_bound]. Bài 5. Pair sort 2 ==*/
			freopen("Untitled4_input8.txt", "r", stdin);
			int n; cin >> n;
			iii a[n];
			for(int i=0; i < n; i++) cin >> a[i].fi >> a[i].se.fi >> a[i].se.se;
			sort(a, a + n, cmp_pair2_min_to_max); //
			for(iii x: a) cout << x.fi << " " << x.se.fi << " " << x.se.se << endl;
			break;
		}
		case 9:{
			/*== [Comparator Lower_bound Upper_bound]. Bài 10. Sắp xếp pair 2 ==*/
			freopen("Untitled4_input9.txt", "r", stdin);
			int n; cin >> n;
			ii a[n];
			for(int i = 0; i < n; i++) cin >> a[i].fi >> a[i].se;
			sort(a, a + n, cmp_bai10);
			for(ii x: a) cout << x.fi << " " << x.se << endl;
			cout << endl;
			break;
		}
		case 10:{
			/*== [Comparator Lower_bound Upper_bound]. Bài 8. Sắp xếp chữ số nguyên tố ==*/
			freopen("Untitled4_input10.txt", "r", stdin);
			int n; cin >> n;
			int a[n];
			for(int i = 0; i < n; i++){
				cin >> a[i];
			}
//			sort(a2, a2 + n2, cmp_bai8); //
			stable_sort(a, a + n, cmp_bai8); // merge sort
			for(int x: a) cout << x << " ";
			cout << endl;
			break;
		}
		case 11:{
			/*== [Comparator Lower_bound Upper_bound]. Bài 1. Comparison function ==*/
			freopen("Untitled4_input11.txt", "r", stdin);
			int n; cin >> n;
			int a[n], b[n];
			for(int i = 0; i < n; i++) {
				cin >> a[i];
				b[i] = a[i];
			}
			sort(a, a + n, cmp1_bai1); // merge sort
			for(int x: a) cout << x << " ";
			cout << endl;
			stable_sort(b, b + n, cmp2_bai1);
			for(int x: b) cout << x << " ";
			break;
		}
		case 12:{
			/*== [Comparator Lower_bound Upper_bound]. Bài 2. Sắp xếp theo trị tuyệt đối ==*/
			freopen("Untitled4_input12.txt", "r", stdin);
			int n; cin >> n >> X;
			int a[n], b[n];
			for(int i = 0; i < n; i++){
				cin >> a[i];
			}
			sort(a, a + n, cmp1_bai2); // merge sort
			for(int x: a) cout << x << " ";
			cout << endl;
			sort(a, a + n, cmp2_bai2);
			for(int x: a) cout << x << " ";
			break;
		}
		case 13:{
			/*== 2. Tìm kiếm nhị phân (Binary Search): ==*/
			int a[] = {1, 1, 2, 2, 3, 5, 6, 8, 10, 12, 14};
			int n = 11;
			cout << binary_search(a, a + n, 2) << endl;
			cout << endl;
			cout << firstPos(a, 0, n-1, 2) << endl;
			break;
		}
		case 14:{
			/*== [Comparator Lower bound Upper bound]. Bài 11. First position ==*/
			freopen("Untitled4_input14.txt", "r", stdin);
			int n, x; cin >> n >> x;
			int a[n];
			for(int i=0; i < n; i++) cin >> a[i];
			cout << firstPos(a, 0, n - 1, x) << endl;
			break;
		}
		case 15:{
			/*== [Comparator Lower_bound Upper_bound]. Bài 12. Last position ==*/
			freopen("Untitled4_input14.txt", "r", stdin);
			int n, x; cin >> n >> x;
			int a[n];
			for(int i=0; i < n; i++) cin >> a[i];
			cout << lastPos(a, 0, n - 1, x) << endl;
			break;
		}
		case 16:{
			/*== 7. LOWER_BOUND: ==*/
			int a[] = {1, 1, 2, 2, 3, 6, 7, 8, 10, 14, 24};
			int n = 11;
			//tim vi tri cua phan tu dau tien >= 9 trong mang
			int *pos = lower_bound (a, a + n, 9); // a + 8
			cout << *pos << endl;
			cout << pos - a << endl;
			break;
		}
		case 17:{
			/*== [Comparator Lower_bound Upper_bound]. Bài 15. Lớn hơn ==*/
			freopen("Untitled4_input17.txt", "r", stdin);
			int n, m;
			cin >> n >> m;
			int a[n], b[m];
			for(int i = 0; i < n; i++) cin >> a[i];
			for(int i = 0; i < m; i++) cin >> b[i];
			sort(b, b + m);
			for(int x : a) {
				int *pos = upper_bound(b, b + m, x);
				int index = pos - b;
				cout << m - index << " ";
			}
			break;
		}
	}
	return 0;
}