#include <bits/stdc++.h>
using namespace std;
using ll = long long;


/*== [Đồng Dư]. Bài 5. Dãy số 23 ==*/
ll F[1000005];
int mod = 1000000007;
/*== [Đồng Dư]. Bài 7. Lũy thừa chi dư bản khó ==*/
ll binpow(ll a, ll b){
    if(b == 0)
        return 1;
    ll X = binpow(a, b / 2);
    if(b % 2 == 0)
//        return X * X;
        return (X % mod) * (X % mod) % mod;
    else
//        return X * X * a;
        return ((X % mod) * (X % mod) % mod * (a % mod)) % mod;
}
/*== [Lý Thuyết Số - Toán Học]. Bài 13. Bậc của thừa số nguyên tố trong N! ==*/
ll solve1(ll n, ll p){
    ll ans = 0;
    for(ll i = p; i <= n; i += p){
        ll j = i;
        while(j % p == 0){
            ++ans;
            j /= p;
        }
    }
    return ans;
}
/*== [Lý Thuyết Số - Toán Học]. Bài 14. Trailing zero ==*/
ll solve2(ll n, ll p){
    ll ans = 0;
    for(ll i = p; i <= n; i += p){
        ans += n/i;
		ans %= mod;
    }
    return ans;
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
			/*== [Đồng dư]. Bài 1. Tổng chia dư ==*/
			// 
			// Cho N số nguyên, tính tổng các số và lấy dư cho 10^9 + 7.
			//
			// Đầu vào:
			// - Dòng 1: N là số lượng số nguyên.
			// - Dòng 2: Gồm N số nguyên, cách nhau bởi khoảng trắng.
			//
			// Giới hạn:
			// - 1 <= N <= 10^5
			// - Các số là số nguyên dương, không quá 10^16.
			//
			// Đầu ra:
			// - In ra tổng các số chia dư cho 10^9 + 7.
			//
			// Ví dụ:
			// Input:
			// 5
			// 534 7 669 826 610
			//
			// Output:
			// 2646
			freopen("Untitled6_input1.txt", "r", stdin);
			int n; cin >> n;
			int mod = 1000000007;
			ll tong = 0;
			for(int i = 0; i < n; i++){
			    ll x; cin >> x;
			    tong += x % mod;
			    tong %= mod;
			}
			cout << tong << endl;
			break;
		}
    	case 2:{
			/*== [Đồng dư]. [Đồng Dư]. Bài 2. Tích chia dư ==*/
			//
			// Cho N số nguyên, tính tích các số này và lấy dư cho 10^9 + 7.
			//
			// Đầu vào:
			// - Dòng 1: N là số lượng số nguyên.
			// - Dòng 2: Gồm N số nguyên, cách nhau bởi khoảng trắng.
			//
			// Giới hạn:
			// - 1 <= N <= 10^5
			// - Các số là số nguyên dương, không quá 10^6.
			//
			// Đầu ra:
			// - In ra tích các số chia dư cho 10^9 + 7.
			//
			// Ví dụ:
			// Input:
			// 5
			// 153 747 236 481 789
			//
			// Output:
			// 861464449
			freopen("Untitled6_input2.txt", "r", stdin);
			int n; cin >> n;
			int mod = 1000000007;
			ll tich = 1;
			for(int i = 0; i < n; i++){
			    ll x; cin >> x;
//			    tich *= x % mod;
//			    tich %= mod;
			    tich = (tich % mod) * (x % mod) % mod;
			}
			cout << tich << endl;
			break;
//				+---------+--------+------------------------------------+--------------------+------------------------+
//				| Vong lap| Gia tri| Phap tinh trong code               | Gia tri tich thu   | Y nghia                |
//				| (i)     | x      |                                    | duoc               |                        |
//				+---------+--------+------------------------------------+--------------------+------------------------+
//				| i = 0   | 153    | (1 % mod) * (153 % mod) % mod      | 153                | Tich den x[0]          |
//				| i = 1   | 747    | (153 % mod) * (747 % mod) % mod    | 114291             | Tich den x[1]          |
//				| i = 2   | 236    | (114291 % mod) * (236 % mod) % mod | 26972676           | Tich den x[2]          |
//				| i = 3   | 481    | (26972676 % mod) * (481 % mod) %mod| 973857158          | Tich den x[3]          |
//				| i = 4   | 789    | (973857158 % mod) * (789 % mod)%mod| 373248889          | Tich den x[4] (Két qua)|
//				+---------+--------+------------------------------------+--------------------+------------------------+
//				Ket qua in ra màn hinh (Output): 373248889
		}
    	case 3:{
			/*== [Đồng Dư]. Bài 3. Giai thừa chia dư ==*/
			//
			// Tính giai thừa các số từ 1 tới N và chia dư cho 10^9 + 7.
			//
			// Đầu vào:
			// - Dòng duy nhất chứa số nguyên dương N.
			//
			// Giới hạn:
			// - 1 <= N <= 10^6
			//
			// Đầu ra:
			// - In ra N dòng, tương ứng với giai thừa các số từ 1 tới N
			//   sau khi chia dư cho 10^9 + 7.
			//
			// Ví dụ:
			// Input:
			// 5
			//
			// Output:
			// 1
			// 2
			// 6
			// 24
			// 120
			int n; cin >> n;
			int mod = 1000000007;
			ll tich = 1;
			for(int i = 1; i <= n; i++){
			    tich *= i % mod;
			    tich %= mod;
			    cout << tich << endl;
			}
			break;
//				+---------+--------+------------------------------------+--------------------+---------------+
//				| Vong lap| Phap tinh trong code              | Gia tri tich thu   | Gia tri in ra | Y nghia |
//				| (i)     |                                   | duoc               |               |         |
//				+---------+-----------------------------------+--------------------+---------------+---------+
//				| i = 1   | tich = (1 * (1 % mod)) % mod      | 1                  | 1             | 1!      |
//				| i = 2   | tich = (1 * (2 % mod)) % mod      | 2                  | 2             | 2!      |
//				| i = 3   | tich = (2 * (3 % mod)) % mod      | 6                  | 6             | 3!      |
//				| i = 4   | tich = (6 * (4 % mod)) % mod      | 24                 | 24            | 4!      |
//				| i = 5   | tich = (24 * (5 % mod)) % mod     | 120                | 120           | 5!      |
//				+---------+-----------------------------------+--------------------+---------------+---------+
		}
    	case 4:{
			/*== [Đồng Dư]. Bài 4. Chữ số cuối cùng ==*/
			// Tìm K chữ số cuối cùng của N^M, kết quả có thể không đủ K chữ số.
			//
			// Ví dụ:
			// - 9^5 = 59049, K = 3 => kết quả là 49.
			//
			// Gợi ý:
			// - Tính N^M chia dư cho 10^K.
			//
			// Đầu vào:
			// - Gồm 3 số N, M, K.
			//
			// Giới hạn:
			// - 1 <= N, M <= 10^6
			// - 1 <= K <= 9
			//
			// Đầu ra:
			// - In ra K chữ số cuối cùng của N^M.
			//
			// Ví dụ:
			// Input:
			// 9 8 1
			//
			// Output:
			// 1
			freopen("Untitled6_input4.txt", "r", stdin);
    		int n, m, k;
    		cin >> n >> m >> k;
			int mod = pow(10, k);
			ll tich = 1;
			for(int i = 1; i <= m; i++){
			    tich *= n % mod;
			    tich %= mod;
			}
			cout << tich << endl;
			break;
//			+---------+-----------------------------------+--------------------+---------------+---------------------+
//			| Vong lap| Phep tinh trong code              | Gia tri tich thu   | Gia tri in ra | Y nghia             |
//			| (i)     |                                   | duoc               | (neu co)      |                     |
//			+---------+-----------------------------------+--------------------+---------------+---------------------+
//			| i = 1   | tich = (1 * (9 % 10)) % 10        | 9                  |               | 9^1 mod 10 = 9      |
//			| i = 2   | tich = (9 * (9 % 10)) % 10        | 1                  |               | 9^2 mod 10 = 81->1  |
//			| i = 3   | tich = (1 * (9 % 10)) % 10        | 9                  |               | 9^3 mod 10 = 729->9 |
//			| i = 4   | tich = (9 * (9 % 10)) % 10        | 1                  |               | 9^4 mod 10 = 1      |
//			| i = 5   | tich = (1 * (9 % 10)) % 10        | 9                  |               | 9^5 mod 10 = 9      |
//			| i = 6   | tich = (9 * (9 % 10)) % 10        | 1                  |               | 9^6 mod 10 = 1      |
//			| i = 7   | tich = (1 * (9 % 10)) % 10        | 9                  |               | 9^7 mod 10 = 9      |
//			| i = 8   | tich = (9 * (9 % 10)) % 10        | 1                  |               | 9^8 mod 10 = 1      |
//			+---------+-----------------------------------+--------------------+---------------+---------------------+
//			Ket qua in ra man hinh (Output): 1 (Do 9^8 = 43,046,721 -> Chu so cuoi cung la 1).
		}
    	case 5:{
			/*== [Đồng Dư]. Bài 5. Dãy số 23 ==*/
			// Dãy số 23 được định nghĩa như sau:
			// - F(1) = 1
			// - F(2) = 1
			// - F(n) = 2 * F(n - 1) + 3 * F(n - 2)
			//
			// Một số phần tử đầu tiên của dãy:
			// 1, 1, 5, 13, 41, ...
			//
			// Yêu cầu:
			// - Tính số thứ n trong dãy số 23 và chia dư cho 10^9 + 7.
			//
			// Đầu vào:
			// - Dòng duy nhất chứa số nguyên dương n.
			//
			// Giới hạn:
			// - 1 <= n <= 10^6
			//
			// Đầu ra:
			// - In ra đáp án của bài toán.
			//
			// Ví dụ:
			// Input:
			// 6
			//
			// Output:
			// 121
    		F[1] = 1;
			F[2] = 1;
			for(int i = 3; i <= 1000000; i++){
			    F[i] = 2 * F[i - 1] + 3 * F[i - 2];
			    F[i] %= mod;
			}
			int n; cin >> n;
			cout << F[n] << endl;
			break;
//			+---------+-----------------------------------+--------------------+---------------+----------------------------+
//			| Vong lap| Phep tinh trong code              | Gia tri F[i]       | Gia tri in ra | Y nghia                    |
//			| (i)     |                                   | thu duoc           | (neu co)      |                            |
//			+---------+-----------------------------------+--------------------+---------------+----------------------------+
//			| i = 3   | F[3] = (2 * F[2] + 3 * F[1]) % mod| (21 + 31) = 5      |               | F[3] = 21 + 31 = 5         |
//			|         |      = (2 * 1 + 3 * 1) % mod      |                    |               |                            |
//			+---------+-----------------------------------+--------------------+---------------+----------------------------+
//			| i = 4   | F[4] = (2 * F[3] + 3 * F[2]) % mod| (25 + 31) = 13     |               | F[4] = 25 + 31 = 13        |
//			|         |      = (2 * 5 + 3 * 1) % mod      |                    |               |                            |
//			+---------+-----------------------------------+--------------------+---------------+----------------------------+
//			| i = 5   | F[5] = (2 * F[4] + 3 * F[3]) % mod| (213 + 35) = 41    |               | F[5] = 213 + 35 = 41       |
//			|         |      = (2 * 13 + 3 * 5) % mod     |                    |               |                            |
//			+---------+-----------------------------------+--------------------+---------------+----------------------------+
//			| i = 6   | F[6] = (2 * F[5] + 3 * F[4]) % mod| (241 + 313) = 121  |               | F[6] = 241 + 313 = 121     |
//			|         |      = (2 * 41 + 3 * 13) % mod    |                    |               |                            |
//			+---------+-----------------------------------+--------------------+---------------+----------------------------+
//			Khi nhap N = 6, thuat toan in ra F[6] = 121 (Khop voi Vi du Output).
		}
     	case 6:{
			/*== [Đồng Dư]. Bài 6. Lũy thừa chia dư bản dễ ==*/
			// Cho 2 số nguyên a và b, tính a^b % 1000000007.
			//
			// Đầu vào:
			// - Dòng duy nhất chứa 2 số nguyên a, b.
			//
			// Giới hạn:
			// - 1 <= a, b <= 10^6
			//
			// Đầu ra:
			// - In ra kết quả của bài toán.
			//
			// Ví dụ:
			// Input:
			// 2 10
			//
			// Output:
			// 1024
// 			freopen("Untitled6_input6.txt", "r", stdin);
 			ll a, b;
			ll tich = 1;
			cin >> a >> b;
			for(int i = 1; i <= b; i++){
			    tich *= a;
			    tich %= mod;
			}
			cout << tich << endl;
			break;
//			+---------+-----------------------------------+--------------------+---------------+---------------------+
//			| Vong lap| Phep tinh trong code              | Gia tri tich thu   | Gia tri in ra | Y nghia             |
//			| (i)     |                                   | duoc               | (neu co)      |                     |
//			+---------+-----------------------------------+--------------------+---------------+---------------------+
//			| i = 1   | tich = (1 * 2) % mod              | 2                  |               | 2^1 = 2             |
//			| i = 2   | tich = (2 * 2) % mod              | 4                  |               | 2^2 = 4             |
//			| i = 3   | tich = (4 * 2) % mod              | 8                  |               | 2^3 = 8             |
//			| i = 4   | tich = (8 * 2) % mod              | 16                 |               | 2^4 = 16            |
//			| i = 5   | tich = (16 * 2) % mod             | 32                 |               | 2^5 = 32            |
//			| i = 6   | tich = (32 * 2) % mod             | 64                 |               | 2^6 = 64            |
//			| i = 7   | tich = (64 * 2) % mod             | 128                |               | 2^7 = 128           |
//			| i = 8   | tich = (128 * 2) % mod            | 256                |               | 2^8 = 256           |
//			| i = 9   | tich = (256 * 2) % mod            | 512                |               | 2^9 = 512           |
//			| i = 10  | tich = (512 * 2) % mod            | 1024               |               | 2^10 = 1024         |
//			+---------+-----------------------------------+--------------------+---------------+---------------------+
//			Ket qua in ra man hinh (Output): 1024
 		}
     	case 7:{
			/*== [Đồng Dư]. Bài 7. Lũy thừa chi dư bản khó ==*/
			// Cho 2 số nguyên a và b, tính a^b % 1000000007.
			// Bài này do số mũ b rất lớn nên không thể duyệt từ 1 tới b để nhân dồn, bạn cần dùng lũy thừa nhị phân
			//
			// Đầu vào:
			// - Dòng duy nhất chứa 2 số nguyên a, b.
			//
			// Giới hạn:
			// - 1 <= a, b <= 10^6
			//
			// Đầu ra:
			// - In ra kết quả của bài toán.
			//
			// Ví dụ:
			// Input:
			// 2 10
			//
			// Output:
			// 1024
//			freopen("Untitled6_input7.txt", "r", stdin);
			ll a, b;
			ll tich = 1;
			cin >> a >> b;
			cout << binpow(a, b) << endl;
 			break;
// 			+-------+-----+---------+-----------+-----------------------+-------------------+
//			| Bước  |  b  |  b % 2  | Giá trị X |      Phép tính        | Trả về kết quả    |
//			+-------+-----+---------+-----------+-----------------------+-------------------+
//			|   5   |  0  |  Cơ sở  |     -     | return 1              | 1                 |
//			|   4   |  1  |   Lẻ    |     1     | X * X * a = 1*1*2     | 2                 |
//			|   3   |  2  |  Chẵn   |     2     | X * X     = 2*2       | 4                 |
//			|   2   |  5  |   Lẻ    |     4     | X * X * a = 4*4*2     | 32                |
//			|   1   | 10  |  Chẵn   |    32     | X * X     = 32*32     | 1024              |
//			+-------+-----+---------+-----------+-----------------------+-------------------+
 		}
     	case 8:{
			/*== [Lý Thuyết Số - Toán Học]. Bài 10. Đếm ước ==*/
// 			Cho phân tích thừa số nguyên tố của một số nguyên dương N, hãy đếm số lượng ước số của số nguyên dương đô
//			Ví dụ N = 60 = 2 ^ 2 * 3 ^ 1 * 5 ^ 1 thì số ước của 60 = (2 + 1)(1 + 1)(1 + 1) = 12 ước.
//			Công thức tìm ước dựa vào phân tích thừa số nguyên tố:
 			freopen("Untitled6_input8.txt", "r", stdin);
 			int t; cin >> t;
			ll tich = 1;
			while(t--){
			    int p, e; cin >> p >> e;
			    tich *= (e + 1);
			    tich %= mod;
			}
			cout << tich << endl;
//			+---------+--------+---+---+---------+------------------------------------+--------------------+
//			| Vong lap| T con  | p | e | e + 1   | Phep tinh trong code               | Gia tri tich thu   |
//			|         | lai    |   |   |         |                                    | duoc               |
//			+---------+--------+---+---+---------+------------------------------------+--------------------+
//			| Lan 1   | 3 -> 2 | 2 | 2 | 3       | tich = (1 * 3) % mod               | 3                  |
//			| Lan 2   | 2 -> 1 | 3 | 1 | 2       | tich = (3 * 2) % mod               | 6                  |
//			| Lan 3   | 1 -> 0 | 5 | 1 | 2       | tich = (6 * 2) % mod               | 12                 |
//			+---------+--------+---+---+---------+------------------------------------+--------------------+
 			break;
 		}
     	case 9:{
			/*== [Lý Thuyết Số - Toán Học]. Bài 69. Số chính phương nhỏ nhất ==*/
			// Cho số N, nhiệm vụ là tìm số nhỏ nhất có N mà là số chính phương.
			// Ví dụ: N = 12 thì số đó là 36.
			//
			// Đầu vào:
			// - Dòng duy nhất chứa số nguyên dương N.
			//
			// Giới hạn:
			// - 1 <= N <= 10^8
			//
			// Đầu ra:
			// - In ra đáp án của bài toán.
			//
			// Ví dụ:
			// Input:
			// 70
			//
			// Output:
			// 4900
// 			freopen("Untitled6_input9.txt", "r", stdin);
 			ll n; cin >> n;
			ll res = n;
			for(int i = 2; i <= sqrt(n); i++){
			    if(n % i == 0){
			        int mu = 0;
			        while(n % i == 0){
			            ++mu;
			            n /= i;
			        }
			        if(mu % 2 == 1){
			            res *= i;
			        }
			    }
			}
			if(n > 1) res *= n;
			cout << res << endl;
 			break;
// 			+------+--------+--------------+------------+--------------------+----------------+-------------------+----------------------------+
//			| i    | sqrt(n)| Điêu kien    | Bien mu    | n sau chia         | mu % 2 == 1?   | res cap nhat      | Giai thich / Y nghia       |
//			|      |        | (n % i == 0) | (Dem so mu)|                    |                |                   |                            |
//			+------+--------+--------------+------------+--------------------+----------------+-------------------+----------------------------+
//			| i=2  | 8.36   | 70 % 2 == 0  | mu = 1     | n = 70 / 2 = 35    | 1 % 2 == 1     | res = 70 * 2      | Thua so 2 co mu 1 (le),    |
//			|      |        | (ĐUNG)       |            |                    | (ĐUNG)         |     = 140         | nhan them 2 vao res.       |
//			+------+--------+--------------+------------+--------------------+----------------+-------------------+----------------------------+
//			| i=3  | 5.91   | 35 % 3 == 0  | mu = 0     | n = 35             | -              | res = 140         | 35 khong chia het cho 3.   |
//			|      |        | (SAI)        |            |                    |                |                   |                            |
//			+------+--------+--------------+------------+--------------------+----------------+-------------------+----------------------------+
//			| i=4  | 5.91   | 35 % 4 == 0  | mu = 0     | n = 35             | -              | res = 140         | 35 khong chia het cho 4.   |
//			|      |        | (SAI)        |            |                    |                |                   |                            |
//			+------+--------+--------------+------------+--------------------+----------------+-------------------+----------------------------+
//			| i=5  | 5.91   | 35 % 5 == 0  | mu = 1     | n = 35 / 5 = 7     | 1 % 2 == 1     | res = 140 * 5     | Thua so 5 co mu 1 (le),    |
//			|      |        | (ĐUNG)       |            |                    | (ĐUNG)         |     = 700         | nhan them 5 vao res.       |
//			+------+--------+--------------+------------+--------------------+----------------+-------------------+----------------------------+
//			| i=6  | 2.64   | i <= sqrt(n) | -          | n = 7              | -              | res = 700         | DUNG VONG LAP FOR          |
//			|      |        | (6 <= 2.64)  |            |                    |                |                   | (i = 6 > sqrt(7) ≈ 2.64).  |
//			|      |        | (SAI)        |            |                    |                |                   |                            |
//			+------+--------+--------------+------------+--------------------+----------------+-------------------+----------------------------+
 		}
     	case 10:{
			/*== [Lý Thuyết Số - Toán Học]. Bài 13. Bậc của thừa số nguyên tố trong N! ==*/
			// Cho số tự nhiên N và số nguyên tố p.
			// Tìm số x lớn nhất sao cho N! chia hết cho p^x.
			//
			// Ví dụ:
			// - N = 10, p = 3 thì x = 4.
			// - Vì 10! chia hết cho 3^4.
			//
			// Tham khảo lý thuyết:
			// - Bậc của thừa số nguyên tố trong N!.
			//
			// Đầu vào:
			// - Cặp số N, p được viết cách nhau bởi một khoảng trắng.
			//
			// Giới hạn:
			// - 1 <= N <= 10^14
			// - 2 <= p <= 5000
			//
			// Đầu ra:
			// - In ra kết quả trên một dòng.
// 			freopen("Untitled6_input10.txt", "r", stdin);
 			cout << solve1(13, 3) << endl;
 			break;
// 			+-------+-----------+---------------+---------------+--------------------+------------------+
//			| i     | Điêu kien | khoi tao j = i| Vong lap while| Bien ans         | Giai thich       |
//			|       | (i <= 13) |               | (j % 3 == 0)  | cap nhat           |                  |
//			+-------+-----------+---------------+---------------+--------------------+------------------+
//			| i = 3 | 3 <= 13   | j = 3         | - j=3 % 3 == 0| ans = 0 + 1 = 1    | So 3 bang 3^1    |
//			|       | (ĐUNG)    |               |   -> j = 1    |                    | (chua 1 thua so 3|
//			|       |           |               | - j=1 % 3 != 0|                    |                  |
//			|       |           |               |   -> DUNG     |                    |                  |
//			+-------+-----------+---------------+---------------+--------------------+------------------+
//			| i = 6 | 6 <= 13   | j = 6         | - j=6 % 3 == 0| ans = 1 + 1 = 2    | So 6 bang 2 * 3^1|
//			|       | (ĐUNG)    |               |   -> j = 2    |                    | (chua 1 thua so 3|
//			|       |           |               | - j=2 % 3 != 0|                    |                  |
//			|       |           |               |   -> DUNG     |                    |                  |
//			+-------+-----------+---------------+---------------+--------------------+------------------+
//			| i = 9 | 9 <= 13   | j = 9         | - j=9 % 3 == 0| ans = 2 + 1 = 3    | So 9 bang 3^2    |
//			|       | (ĐUNG)    |               |   -> j = 3    |                    | (chua 2 thua so 3|
//			|       |           |               | - j=3 % 3 == 0| ans = 3 + 1 = 4    |                  |
//			|       |           |               |   -> j = 1    |                    |                  |
//			|       |           |               | - j=1 % 3 != 0|                    |                  |
//			|       |           |               |   -> DUNG     |                    |                  |
//			+-------+-----------+---------------+---------------+--------------------+------------------+
//			| i = 12| 12 <= 13  | j = 12        | - j=12% 3 == 0| ans = 4 + 1 = 5    | So 12 bang 4*3^1 |
//			|       | (ĐUNG)    |               |   -> j = 4    |                    | (chua 1 thua so 3|
//			|       |           |               | - j=4 % 3 != 0|                    |                  |
//			|       |           |               |   -> DUNG     |                    |                  |
//			+-------+-----------+---------------+---------------+--------------------+------------------+
//			| i = 15| 15 <= 13  | -             | -             | ans = 5            | KET THUC FOR     |
//			|       | (SAI)     |               |               |                    | (i > 13)         |
//			+-------+-----------+---------------+---------------+--------------------+------------------+
//			Ket qua in ra (Output): 5
 		}
     	case 11:{
			/*== [Lý Thuyết Số - Toán Học]. Bài 14. Trailing zero ==*/
 			// In ra số lượng chữ số 0 liên tiếp tính từ cuối của N!.
			//
			// Ví dụ:
			// - N = 10, 10! = 3628800.
			// - Vì vậy, 10! có 2 chữ số 0 liên tiếp tính từ cuối.
			//
			// Tham khảo lý thuyết:
			// - Bậc của thừa số nguyên tố trong N!.
			//
			// Đầu vào:
			// - Dòng duy nhất chứa số nguyên dương N.
			//
			// Giới hạn:
			// - 1 <= N <= 10^18
			//
			// Đầu ra:
			// - In ra số lượng chữ số 0 liên tiếp tính từ cuối của N!.
			// - Kết quả lấy dư với 1000000007.
			//
			// Ví dụ:
			// Input:
			// 10
// 			freopen("Untitled6_input11.txt", "r", stdin);
			ll n, p;
			cin >> n;
			cout << solve2(n, 5) << endl;
 			break;
// 			+-------+-----------+---------------+--------------------+--------------------+--------------------+
//			| i     | Đieu kien | Khoi tao j = i| Vong lap while     | Bien ans           | Giai thich         |
//			|       | (i <= 26) |               | (j % 5 == 0)       | cap nhat           |                    |
//			+-------+-----------+---------------+--------------------+--------------------+--------------------+
//			| i = 5 | 5 <= 26   | j = 5         | - j=5 % 5 == 0     | ans = 0 + 1 = 1    | So 5 có 1          |
//			|       | (ĐUNG)    |               |   -> j = 1         |                    | thua so 5 (5^1)    |
//			|       |           |               | - j=1 % 5 != 0     |                    |                    |
//			|       |           |               |   -> DUNG WHILE    |                    |                    |
//			+-------+-----------+---------------+--------------------+--------------------+--------------------+
//			| i = 10| 10 <= 26  | j = 10        | - j=10 % 5 == 0    | ans = 1 + 1 = 2    | So 10 = 2 * 5      |
//			|       | (ĐUNG)    |               |   -> j = 2         |                    | (chua 1 thua so 5) |
//			|       |           |               | - j=2 % 5 != 0     |                    |                    |
//			|       |           |               |   -> DUNG WHILE    |                    |                    |
//			+-------+-----------+---------------+--------------------+--------------------+--------------------+
//			| i = 15| 15 <= 26  | j = 15        | - j=15 % 5 == 0    | ans = 2 + 1 = 3    | So 15 = 3 * 5      |
//			|       | (ĐUNG)    |               |   -> j = 3         |                    | (chua 1 thua so 5) |
//			|       |           |               | - j=3 % 5 != 0     |                    |                    |
//			|       |           |               |   -> DUNG WHILE    |                    |                    |
//			+-------+-----------+---------------+--------------------+--------------------+--------------------+
//			| i = 20| 20 <= 26  | j = 20        | - j=20 % 5 == 0    | ans = 3 + 1 = 4    | So 20 = 4 * 5      |
//			|       | (ĐUNG)    |               |   -> j = 4         |                    | (chua 1 thua so 5) |
//			|       |           |               | - j=4 % 5 != 0     |                    |                    |
//			|       |           |               |   -> DUNG WHILE    |                    |                    |
//			+-------+-----------+---------------+--------------------+--------------------+--------------------+
//			| i = 25| 25 <= 26  | j = 25        | - j=25 % 5 == 0    | ans = 4 + 1 = 5    | So 25 = 5^2        |
//			|       | (ĐUNG)    |               |   -> j = 5         |                    | (chua 2 thua so 5) |
//			|       |           |               | - j=5 % 5 == 0     | ans = 5 + 1 = 6    |                    |
//			|       |           |               |   -> j = 1         |                    |                    |
//			|       |           |               | - j=1 % 5 != 0     |                    |                    |
//			|       |           |               |   -> DUNG WHILE    |                    |                    |
//			+-------+-----------+---------------+--------------------+--------------------+--------------------+
//			| i = 30| 30 <= 26  | -             | -                  | ans = 6            | DUNG VONG LAP FOR  |
//			|       | (SAI)     |               |                    |                    | (i > 26)           |
//			+-------+-----------+---------------+--------------------+--------------------+--------------------+
//			Ket qua in ra (Output): 6
 		}
     	case 12:{
			/*== [Lý Thuyết Số - Toán Học]. Bài 13. Bậc của thừa số nguyên tố trong N! ==*/
			// Cho số tự nhiên N và số nguyên tố p.
			// Tìm số x lớn nhất để N! chia hết cho p^x.
			//
			// Ví dụ:
			// - N = 10, p = 3 thì x = 4.
			// - Vì 10! chia hết cho 3^4.
			//
			// Tham khảo lý thuyết:
			// - Bậc của thừa số nguyên tố trong N!.
			//
			// Đầu vào:
			// - Cặp số N, p được viết cách nhau một khoảng trắng.
			//
			// Giới hạn:
			// - 1 <= N <= 10^14
			// - 2 <= p <= 5000
			//
			// Đầu ra:
			// - Đưa ra kết quả trên một dòng.
// 			freopen("Untitled6_input12.txt", "r", stdin);
 			cout << solve1(18, 2) << endl;
			cout << solve1(18, 3) << endl;
			cout << solve2(18, 2) << endl;
			cout << solve2(18, 3) << endl;
 			break;
 		}
//    	case 13:{
			/*==  ==*/
//			
//			freopen("Untitled6_input13.txt", "r", stdin);
//			break;
//		}
//    	case 14:{
			/*==  ==*/
//			
//			freopen("Untitled6_input14.txt", "r", stdin);
//			break;
//		}
	}
	return 0;
}