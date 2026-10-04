#include<bits/stdc++.h>

using namespace std;
using ll = long long;

//int main(){
//	freopen("input5.cpp", "r", stdin);
//	int n; cin >> n;
//	int a[n];
//	for(int i = 0; i < n; i++){
//		cin >> a[i];
//	}
//	sort(a, a+n);
//	int ans = 0;
//	for(int i = 1; i < n; i++){
//		if(a[i] - a[i - 1] > 1){
//			ans += a[i] - a[i - 1] - 1;
//		}
//	}
//	cout << ans << endl;
//	return 0;
//}



int mark[1000005];

int main(){
    freopen("input5.cpp", "r", stdin);
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n; cin >> n;
    int a[n];
    int l = INT_MAX, r = INT_MIN;
    for(int i = 0; i < n; i++){
        cin >> a[i];
        l = min(l, a[i]);
        r = max(r, a[i]);
        mark[a[i]] = 1;
    }
    int ans = 0;
    for(int i = l; i <= r; i++){
        if(mark[i] == 0){
            ++ans;
        }
    }
    cout << ans << endl;
}

