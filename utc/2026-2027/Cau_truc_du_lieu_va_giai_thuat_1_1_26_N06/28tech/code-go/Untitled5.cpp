#include <bits/stdc++.h>
using namespace std;
using ll = long long;

int a[1005][1005];
ll pre[1005][1005]; //case 7
int fre[1000001]; //case 9
int F[1000001]; //case 9
int n, m;

int dx_c10[4] = {-1, 1, 0, 0}; //case 10
int dy_c10[4] = { 0, 0, -1, 1}; //case 10
//int n, m;
int a_c10[100][100]; //case 10
/*== [Mảng 2 Chiều]. Bài 16. Đếm đảo 1 ==*/
void loang_c10(int i, int j){
	a_c10[i][j] = 0;
	//duyet 4 o xung quanh chung canh
	for(int k = 0; k < 4; k++){
	    int i1 = i + dx_c10[k], j1 = j + dy_c10[k];
	    if(i1 >= 0 && i1 < n && j1 >= 0 && j1 < m && a_c10[i1][j1] == 1){
	        loang_c10(i1, j1);
	    }
	}
}


int dx_c11[8] = {-2, -2, -1, -1, +1, +1, +2, +2}; //case 11
int dy_c11[8] = {-1, +1, -2, +2, -2, +2, -1, +1}; //case 11
//int n, m;
int a_c11[105][105]; //case 11
/*== [Mảng 2 Chiều]. Bài 21. Đường đi của quân Mã ==*/
void loang_c11(int i, int j){
	a_c11[i][j] = 0;
	//duyet 4 o xung quanh chung canh
	for(int k = 0; k < 4; k++){
	    int i1 = i + dx_c11[k], j1 = j + dy_c11[k];
	    if(i1 >= 0 && i1 < n && j1 >= 0 && j1 < n && a_c11[i1][j1] == 1){
	        loang_c11(i1, j1);
	    }
	}
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
// **** Note: Dở ở 58:02 / 1:50:54 ****
			freopen("Untitled5_input8.txt", "r", stdin);
			int n, q; cin >> n >> q;
			int a[n];
			for(int i = 0; i < n; i++) cin >> a[i];
			int D[n + 5];
			//D[l] += K, D[r + 1] -= K
			for(int i = 0; i < n; i++){
			    if(i == 0) D[0] = a[0];
			    else D[i] = a[i] - a[i - 1];
			}
			while(q--){
			    int l, r, k;
			    cin >> l >> r >> k;
			    D[l] += k;
			    D[r + 1] -= k;
			}
			ll F[n + 5];
			for(int i = 0; i < n; i++){
			    if(i == 0) F[0] = D[0];
			    else F[i] = F[i - 1] + D[i];
			}
			for(int i = 0; i < n; i++){
			    cout << F[i] << " ";
			}
			break;
		}
		case 9:{
			/*== [Mảng Cộng Dồn - Mảng Hiệu]. Bài 6. Tổng lớn nhất ==*/
//			Tèo đang làm các bài toán với truy vấn tổng trên đoạn, mỗi truy vấn yêu cầu các bạn tính tổng các phần tử từ chỉ số L tới chỉ số R, tuy nhiên bài toán này đã quá quen thuộc và dễ dàng có thể dùng mảng cộng dồn để giải quyết vì thế Tèo đưa ra thêm 1 yêu cầu cho bài toán.
//			Cho trước các truy vấn tổng từ chỉ số L tới chỉ số R, bây giờ bạn đã biết trước tất cả Q truy vấn bạn được phép thay đổi thứ tự các phần tử trong mảng 1 lần duy nhất trước khi thực hiện các truy vấn. Hãy thay đổi mảng sao cho tổng các truy vấn trên đoạn đạt được giá trị lớn nhất. Một cách rõ ràng hơn, bạn hãy tính tổng mọi mảng con trong từng truy vấn sau đó cộng lại để đạt được giá trị lớn nhất.
//			Gợi ý: Dựa vào truy vấn ta xác định được mỗi chỉ số trong mảng được truy vấn bao nhiêu lần, từ đó sẽ ghép những giá trị lớn với những chỉ số được truy vấn nhiều sẽ tạo được tổng lớn nhất. Tạo 1 mảng khởi tạo bằng 0 để lưu xem mỗi chỉ số được truy vấn bao nhiêu lần, cứ mỗi truy vấn L R thì tăng các phần tử từ chỉ số L tới R lên 1 đơn vị, tương ứng với 1 lần được truy vấn. Xây dựng mảng này bằng mảng mảng hiệu, gọi là mảng tần suất của mỗi chỉ số trong mảng. Sort cả mảng A[] và mảng tần suất này để ghép giá trị nhỏ vs tần suất nhỏ, giá trị lớn vs tần suất truy vấn lớn.
//			Đầu vào
//			- Dòng 1 là N và Q
//			- Dòng 2 là N số trong mảng A[]
//			- Q dòng tiếp theo, mỗi dòng là 2 chỉ số L, R của truy vấn
//			Giới hạn
//			- 1 <= N,Q <= 2.10^5
//			- 1 <= A[i] <= 2.10^5
//			- 1 <= L <= R <= N
			freopen("Untitled5_input9.txt", "r", stdin);
			int n, q; cin >> n >> q;
			int a[n + 5];
			for(int i = 1; i <= n; i++) cin >> a[i];
			while(q--){
			    int l, r;
			    cin >> l >> r;
			    fre[l] += 1;
			    fre[r + 1] -= 1;
			}
			for(int i = 1; i <= n; i++){
			    if(i == 1) F[i] = fre[i];
			    else F[i] = F[i - 1] + fre[i];
			}
			sort(a + 1, a + n + 1);
			sort(F + 1, F + n + 1);
			ll ans = 0;
			for(int i = 1; i <= n; i++){
			    ans += 1LL * a[i] * F[i];
			}
			cout << ans << endl;
			break;
		}
		case 10:{
			/*== [Mảng 2 Chiều]. Bài 16. Đếm đảo 1 ==*/
//			Cho ma trận nhị phân gồm N hàng và M cột chỉ bao gồm các số 0 và 1. Hãy đếm số lượng miền các số 1 trong ma trận, các ô số 1 được coi là cùng miền nếu chúng có chung cạnh.
//			Ví dụ về 1 ma trận nhị phân với 6 miền:
//			1 1 1 0 0 1
//			1 1 0 0 1 1
//			0 0 0 0 1 0
//			1 1 1 0 0 0
//			0 0 0 1 0 1
//			1 1 0 0 1 1
//			Đầu vào
//			Dòng đầu tiên N và M. N dòng tiếp theo mỗi dòng gồm M phần tử.
//			Giới hạn
//			1 <= N, M <= 50
//			Đầu ra
//			In ra số lượng miền số 1 trong ma trận.
			freopen("Untitled5_input10.txt", "r", stdin);
			cin >> n >> m;
			for(int i = 0; i < n; i++){
			    for(int j = 0; j < m; j++) cin >> a_c10[i][j];
			}
			int cnt = 0;
			for(int i = 0; i < n; i++){
			    for(int j = 0; j < m; j++){
			        if(a_c10[i][j] == 1){
			            ++cnt;
			            //tu (i, j) di het nhung o chung mien voi no => so 0
			            loang_c10(i, j);
			        }
			    }
			}
			cout << cnt << endl;
			break;
		}
		case 11:{
			/*== [Mảng 2 Chiều]. Bài 21. Đường đi của quân Mã ==*/
//			Cho bàn cờ vua cỡ N * N, các ô trên bàn cờ có giá trị là 0 hoặc 1. Một con mã xuất phát từ ô (s, t) và muốn di chuyển tới ô (u, v), con mã chỉ có thể di chuyển ở các ô mà tại ô đó có giá trị là 1 và nó có thể di chuyển qua lại 1 ô nhiều lần. Hãy xác định xem con mã có thể tìm được đường đi hay không, dữ liệu đảm bảo ô (s, t) và ô (u, v) đều có giá trị là 1.
//			Đầu vào
//			Dòng đầu tiên N.
//			Dòng thứ 2 là 4 số s, t, u, v.
//			N dòng tiếp theo mỗi dòng gồm N phần tử.
//			Giới hạn
//			1 <= N <= 1000
//			1 <= s, t, u, v <= N
//			0 <= A[i][j] <= 1
//			Đầu ra
//			In YES nếu con mã có thể tìm được đường đi, ngược lại in NO.
			freopen("Untitled5_input11.txt", "r", stdin);
			cin >> n;
			int s, t, u, v;
			cin >> s >> t >> u >> v;
			--s; --t; --u; --v;
			for(int i = 0; i < n; i++){
			    for(int j = 0; j < n; j++) cin >> a_c11[i][j];
			}
			loang_c11(s, t);
			if(a_c11[u][v] == 0) cout << "YES\n";
			else cout << "NO\n";
			break;
		}
		case 12:{
			/*== [Mảng 2 Chiều]. Bài 33. Chu vi ==*/
//			Cho mảng A[][] gồm N hàng, M cột chỉ bao gồm các số 0 và 1. Bạn hãy tiến hành tính chu vi của từng vùng số 1 xuất hiện trong mảng, 2 số 1 được coi là cùng vùng với nhau nếu chúng nằm ở 2 ô chung cạnh.
//			Chu vi của 1 vùng số 1 sẽ là tổng độ dài các cạnh bao quanh của các ô số 1 trong vùng đó. Mỗi ô trong mảng 2 chiều là 1 hình vuông có cạnh độ dài là 1.
//			Xem xét ví dụ sau đây thì chu vi vùng số 1 đầu tiên sẽ là 6, vùng số 2 sẽ có chu vi là 10.
//			1 1 0 1 1
//			0 0 0 1 1
//			0 0 0 1 1
//			Gợi ý: Đối với mỗi (i, j) lấy 4 - x, trong đó x là số ô số 1 xung quanh chung cạnh với ô i, j thì 4 - x => số cạnh bao bên ngoài mà ô (i, j) đóng góp vào chu vi của miền
//			Đầu vào
//			- Dòng 1 là N và M
//			- N dòng tiếp theo mỗi dòng gồm M số 0 hoặc 1
//			Giới hạn
//			- 1 <= N, M <= 100
//			- Các phần tử trong mảng A là 0 hoặc 1
			
			break;
		}
	}
	return 0;
}