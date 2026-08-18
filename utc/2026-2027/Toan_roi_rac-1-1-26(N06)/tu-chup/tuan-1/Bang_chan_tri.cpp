#include <iostream>
#include <iomanip>
using namespace std;

// Phu dinh
bool NOT(bool p) {
    return !p;
}

// P va Q
bool AND(bool p, bool q) {
    return p && q;
}

// P hoac Q
bool OR(bool p, bool q) {
    return p || q;
}

// P XOR Q
bool XOR(bool p, bool q) {
    return p != q;
}

// P suy ra Q: P -> Q
bool IMPLIES(bool p, bool q) {
    return !p || q;
}

// P tuong duong Q: P <-> Q
bool IFF(bool p, bool q) {
    return p == q;
}

int main() {
    cout << boolalpha;

    cout << "=====================================================================\n";
    cout << " p  q | !p | !q | p^q | p+q | p xor q | p->q | p<->q\n";
    cout << "=====================================================================\n";

    bool values[] = {true, false};

    for (bool p : values) {
        for (bool q : values) {

            cout << setw(2) << p << " "
                 << setw(2) << q << " | "
                 << setw(2) << NOT(p) << "  | "
                 << setw(2) << NOT(q) << "  | "
                 << setw(3) << AND(p, q) << " | "
                 << setw(3) << OR(p, q) << "  | "
                 << setw(7) << XOR(p, q) << " | "
                 << setw(4) << IMPLIES(p, q) << "  | "
                 << setw(5) << IFF(p, q)
                 << endl;
        }
    }

    cout << "=====================================================================\n";

    return 0;
}