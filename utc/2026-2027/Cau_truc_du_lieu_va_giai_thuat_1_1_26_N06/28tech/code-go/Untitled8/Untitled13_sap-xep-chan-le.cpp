#include<bits/stdc++.h>

using namespace std;

int main(){
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    freopen("input13.cpp", "r", stdin);
	// 1 4 2 3
    int n; cin >> n;
    int a[n];
    for(int i = 0; i < n; i++){
        cin >> a[i];
    }
    sort(a, a + n);
    int res[n];
    int idx = 0;
    // Điền các số nhỏ vào vị trí chẵn (0, 2, 4...)
    for(int i = 0; i < n; i += 2){
        res[i] = a[idx++];
    }
    // Điền các số lớn vào vị trí lẻ (1, 3, 5...)
    for(int i = 1; i < n; i += 2){
        res[i] = a[idx++];
    }
    // In kết quả
    for(int i = 0; i < n; i++){
        cout << res[i] << " ";
    }
    cout << "\n";
    return 0;
}