#include<bits/stdc++.h>

using namespace std;
using ll = long long;

bool F(int a[], int n, int t, ll time){
    ll ans = 0;
    for(int i = 0; i < n; i++){
        ans += time / a[i];
    }
    return ans >= t;
}


int main(){
    freopen("input1.txt", "r", stdin);
    int n, t; cin >> n >> t;
    int a[n];
    int minVal = INT_MAX;
    for(int i = 0; i < n; i++){
        cin >> a[i];
        minVal = min(minVal, a[i]);
    }
    ll left = 0, right = 1LL * t * minVal;
    ll ans = -1;
	while(left <= right){
	    ll mid = (left + right) / 2;
	    if(F(a, n, t, mid)){
	        ans = mid;
	        right = mid - 1;
	    }
	    else{
	        left = mid + 1;
	    }
	}
	cout << ans << endl;

}
