#include<bits/stdc++.h>

using namespace std;
using ll = long long;

// Đổi tên tham số 't' thành 'L' và 'time' thành 'H' để khớp với logic bên trong hàm
bool F(int a[], int n, int L, ll H){
    ll ans = 0;
    for(int i = 0; i < n; i++){
        if(a[i] > H){
            ans += a[i] - H;
        }
    }
    return ans >= L;
}

int main(){
    freopen("input2.txt", "r", stdin);
    int n, L; cin >> n >> L;
    int a[n];
    
    // Khởi tạo maxVal bằng 0 để tìm giá trị lớn nhất chính xác
    int maxVal = 0; 
    for(int i = 0; i < n; i++){
        cin >> a[i];
        maxVal = max(maxVal, a[i]); // Sửa minVal thành maxVal
    }
    
    ll left = 0, right = maxVal;
    ll ans = -1;
    while(left <= right){
        ll mid = (left + right) / 2;
        if(F(a, n, L, mid)){
            ans = mid;
            left = mid + 1;
        }
        else{
            right = mid - 1;
        }
    }
    cout << ans << endl;
}
