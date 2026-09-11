#include <bits/stdc++.h>
using namespace std;
using ll = long long;

int a[1005][1005];
ll pre[1005][1005];
int n, m;

int main(){
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int chon;
    cout << "Vui long chon case: " << flush;
    cin >> chon;
    cout << endl;
    switch(chon){
    	case 1:{
			/*== [Comparator Lower_bound Upper_bound]. Bài 3. Lower_bound, Upper_bound ==*/
//			Cho mảng A[] gồm N phần tử ĐÃ SẮP XẾP TĂNG DẦN và số nguyên X, nhiệm vụ của bạn là:
//			1. In ra chỉ số đầu tiên của phần tử >= X trong mảng, nếu không có phần tử nào >= X thì in ra -1.
//			2. In ra chỉ số đầu tiên của phần tử > X trong mảng, nếu không có phần tử nào > X thì in ra -1.
//			3. In ra chỉ số đầu tiên của phần tử X trong mảng, nếu X không tồn tại in ra -1.
//			4. In ra chỉ số cuối cùng của phần tử X trong mảng, nếu X không tồn tại in ra -1.
//			5. Từ kết quả của 3 và 4 in ra số lần xuất hiện của X trong mảng.
//			Bài này các bạn nên tự code 4 hàm kia, sau khi code thành thạo có thể sử dụng luôn lowerbound và upperbound
//			Đầu vào
//			- Dòng 1 là N : số lượng phần tử trong mảng
//			- Dòng 2 là N số trong mảng
//			Giới hạn
//			- 1 <= N <= 10^5
//			- 0 <= A[i] <= 10^9
			// n = 6, x = 3
			// Mảng a = {1, 2, 3, 3, 3, 5}
			int n, x; cin >> n >> x;
			int a[n];
			for(int i = 0; i < n; i++){
			    cin >> a[i];
			}
			int *p1 = lower_bound(a, a + n, x);
			if(p1 != a + n){
			    cout << p1 - a << endl;
			}
			else{
			    cout << "-1\n";
			}
			int *p2 = upper_bound(a, a + n, x);
			if(p2 != a + n){
			    cout << p2 - a << endl;
			}
			else cout << "-1\n";
			if(*p1 == x) cout << p1 - a << endl; // in index
			else cout << "-1\n";
			--p2;
			if(*p2 == x) cout << p2 - a << endl; // in index
			else cout << "-1\n";
			cout << p2 - p1 +1 << endl;
			break;
		}
    	case 2:{
			/*== [Comparator Lower_bound Upper_bound]. Bài 13. Lower ==*/
//			Cho mảng A[] gồm N phần tử được sắp xếp theo thứ tự tăng dần, nhiệm vụ của bạn là giá trị của phần tử lớn nhất nhỏ hơn hoặc bằng X trong mảng hoặc kết luận là không xuất hiện.
//			Lưu ý bài này các bạn cần code bằng 2 cách : Tự cài đặt theo hướng dẫn trong slide và sử dụng hàm upper_bound. Độ phức tạp cần đạt được cho code là O(logN)
//			Đầu vào
//			- Dòng 1 là N và X : số lượng phần tử trong mảng và X
//			- Dòng 2 gồm N số viết cách nhau 1 dấu cách
//			Giới hạn
//			- 1 <= N <= 1000
//			- 0 <= A[i] <= 10^9
			int n, x; cin >> n >> x;
			int a[n];
			for(int i = 0; i < n; i++){
			    cin >> a[i];
			}
			int *p = upper_bound(a, a + n, x);
			if(p == a){
			    cout << "NOT FOUND\n";
			}
			else{
			    --p;
			    cout << *p << endl;
			}
			break;
		}
    	case 3:{
			/*== [Comparator Lower_bound Upper_bound]. Bài 14. Nhỏ hơn ==*/
//			Cho mảng A[], B[] gồm N và M phần tử, nhiệm vụ của bạn là với mỗi phần tử trong mảng A[] bạn hãy chỉ ra có bao nhiêu phần tử trong mảng B[] nhỏ hơn nó.
//			Gợi ý: Sort mảng B[] rồi dùng binarysearch biến đổi hoặc lowerbound, upperbound. Khi đó bạn chỉ cần duyệt qua mảng A[], với mỗi phần tử trong mảng A[] gọi hàm tìm kiếm mất O(logM) nên toàn bộ code có độ phức tạp O(NlogM).
//			Đầu vào
//			- Dòng 1 là N và M
//			- Dòng 2 là mảng A[], dòng 3 là mảng B[]
//			Giới hạn
//			- 1 <= N, M <= 10^6
//			- 0 <= A[i], B[i] <= 10^9
    		int n, m; cin >> n >> m;
			int a[n], b[m];
			for(int i = 0; i < n; i++) cin >> a[i];
			for(int i = 0; i < m; i++) cin >> b[i];
			sort(b, b + m);
			for(int x : a){
			    //tim thang lon nhat < x
			    int *p = lower_bound(b, b + m, x);
			    int indx = p - b;
			    --indx;
			    cout << indx + 1 << " ";
			}
			break;
		}
    	case 4:{
			/*== [Comparator Lower_bound Upper_bound]. Bài 18. Đếm số cặp ==*/
//    		Cho mảng A[] gồm N phần tử và số nguyên K, bạn hãy đếm xem trong mảng có bao nhiêu cặp phần tử A[i], A[j] với i khác j mà có độ chênh lệch giữa chúng bằng K.
//			Gợi ý: Sort mảng A[], duyệt qua từng chỉ số i trong mảng, với mỗi chỉ số i tìm vị trí đầu tiên và vị trí cuối cùng của A[i] + K để đếm số cặp phần tử có thể kết hợp với A[i] để tạo thành cặp có chênh lệch bằng K.
//			Chú ý: Trường hợp k = 0 bạn có thể đếm 1 cặp nhiều lần nếu tìm kiếm từ đầu dãy.
//			Đầu vào
//			- Dòng 1 gồm N và K
//			- Dòng 2 gồm N phần tử trong mảng A[]
//			Giới hạn
//			- 1 <= N <= 10^6
//			- 0 <= K <= 10^6
//			- 0 <= A[i] <= 10^9
			// 
			int n, k; cin >> n >> k;
			int a[n];
			for(int i = 0; i < n; i++) cin >> a[i];
			sort(a, a + n);
			ll ans = 0;
			for(int i = 0; i < n; i++){
			    //i + 1 => n - 1
			    int *p1 = lower_bound(a + i + 1, a + n, a[i] + k);
			    int *p2 = upper_bound(a + i + 1, a + n, a[i] + k);
			    ans += p2 - p1;
			}
			cout << ans << endl;
			break;
		}
    	case 5:{
			/*== [Mảng Cộng Dồn - Mảng Hiệu]. Bài 1. Xây dựng mảng cộng dồn ==*/
//			Cho mảng số nguyên A[] gồm N phần tử, mảng cộng dồn của A[] là mảng F[] với tính chất F[i] lưu tổng các phần tử từ chỉ số 0 tới chỉ số i của mảng A[]. Bạn hãy xây dựng mảng cộng dồn F[]
//			Công thức xây dựng mảng cộng dồn : F[0] = A[0], F[i] = F[i - 1] + A[i] với i > 0
//			Đầu vào
//			- Dòng 1 là N
//			- Dòng 2 là N số nguyên
//			Giới hạn
//			- 1 <= N <= 10^6
//			- 1 <= A[i] <= 10^9
//			Đầu ra
//			In ra mảng cộng dồn
			int n;
			cin >> n;
			int a[n];
			for(int i = 0; i < n; i++){
			    cin >> a[i];
			}
			ll F[n];
			for(int i = 0; i < n; i++){
			    if(i == 0) F[0] = a[0];
			    else F[i] = F[i - 1] + a[i];
			}
			for(int i = 0; i < n; i++){
			    cout << F[i] << " ";
			}
			break;
		}
    	case 6:{
			/*== [Mảng Cộng Dồn - Mảng Hiệu]. Bài 2. Truy vấn tổng tĩnh ==*/
//			Cho mảng số nguyên A[] gồm N phần tử, có Q truy vấn, mỗi truy vấn là 2 số L, R bạn hãy tính tổng các số từ chỉ số L tới chỉ số R của mảng.
//			Đầu vào
//			- Dòng 1 là N và Q
//			- Dòng 2 là N số nguyên
//			- Q dòng tiếp theo mỗi dòng là 1 truy vấn
//			Giới hạn
//			- 1 <= N,Q <= 10^6
//			- 1 <= A[i] <= 10^9
//			- 0 <= L <= R <= N-1
			freopen("Untitled5_input6.txt", "r", stdin);
			int n, q;
			cin >> n >> q;
			int a[n];
			for(int i = 0; i < n; i++){
			    cin >> a[i];
			}
			ll F[n];
			for(int i = 0; i < n; i++){
			    if(i == 0) F[0] = a[0];
			    else F[i] = F[i - 1] + a[i];
			}
			while(q--){
			    int l, r; cin >> l >> r;
			    if(l == 0)
			        cout << F[r] << endl;
			    else
			        cout << F[r] - F[l - 1] << endl;
			}
			break;
		}
    	case 7:{
			/*== [Mảng Cộng Dồn - Mảng Hiệu]. Bài 3. Thu hoạch cà rốt ==*/
//			Tèo hiện tại đã bỏ làm lập trình viên và trở về quê trồng rau nuôi cá, anh ta có một mảnh vườn hình chữ nhật có kích thước NxM. Anh ta chia vườn của mình thành NxM ô vuông và trồng vào đó một cây cà rốt, tới vụ thu hoạch có những cây cà rốt bị chết và có những cây cà rốt có củ, anh ta muốn biết với mỗi mảnh vườn hình chữ nhật bắt đầu từ hàng x1 tới hàng x2 và từ cột y1 tới cột y2 thì số cà rốt thu hoạch được là bao nhiêu.
//			Biết rằng mảnh vườn được mô tả bởi một ma trận nhị phân, 0 tương ứng với cây cà rốt chết và 1 tương ứng với cây cà rốt có củ.
//			Đầu vào
//			- Dòng 1 là N và M
//			- N dòng tiếp theo mỗi dòng M số mô tả mảnh vườn
//			- Dòng tiếp theo là Q : số lượng truy vấn
//			- Q dòng tiếp theo mỗi dòng gồm 4 số : x1, x2, y1, y2
//			Giới hạn
//			- 1 <= N,M <= 1000
//			- 1 <= Q <= 10^5
//			- 1 <= x1,x2 <= N, 1 <= y1,y2 <= M
			freopen("Untitled5_input7.txt", "r", stdin);
			cin >> n >> m;
			for(int i = 1; i <= n; i++){
			    for(int j = 1; j <= m; j++){
			        cin >> a[i][j];
			    }
			}
			for(int i = 1; i <= n; i++){
			    for(int j = 1; j <= m; j++){
			        pre[i][j] = pre[i - 1][j] + pre[i][j - 1] - pre[i - 1][j - 1] + a[i][j];
			    }
			}
			int q; cin >> q;
			while(q--){
			    int h1, h2, c1, c2;
			    cin >> h1 >> h2 >> c1 >> c2;
			    cout << pre[h2][c2] - pre[h1 - 1][c2] - pre[h2][c1 - 1] + pre[h1 - 1][c1 - 1] << endl;
			}
			break;
		}
		case 8:{
			/*== [Mảng Cộng Dồn - Mảng Hiệu]. Bài 4. Mảng hiệu ==*/
//			Cho mảng số nguyên A[] gồm N phần tử, mảng hiệu của mảng A[] là mảng D[] với D[0] = A[0] và D[i] = A[i] - A[i - 1]. Nhiệm vụ của bạn là xây dựng mảng hiệu của mảng A[]
//			Đầu vào
//			- Dòng 1 là N
//			- Dòng 2 là N số nguyên
//			Giới hạn
//			- 1 <= N <= 10^6
//			- 1 <= A[i] <= 10^9
//			Đầu ra
//			In ra mảng hiệu của mảng A[]
//		Example:	A : 3 | 8 | 9 | 2 | 4 | 7 | 1 | 5
//					D : 3 | 5 | 1 | -7 | 2 | 3 | -6 | 4
// Note: Dở ở 58:02 / 1:50:54

			
			break;
		}
	}
	return 0;
}