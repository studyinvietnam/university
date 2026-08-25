def NOT(p):
    return not p


def AND(p, q):
    return p and q


def OR(p, q):
    return p or q


def XOR(p, q):
    return p != q


def IMPLIES(p, q):
    return (not p) or q


def IFF(p, q):
    return p == q


print("=" * 75)
print(" p  q | !p | !q | p^q | p+q | p xor q | p->q | p<->q")
print("=" * 75)

values = [True, False]

for p in values:
    for q in values:
        print(
            f"{str(p):5} "
            f"{str(q):5} | "
            f"{str(NOT(p)):5} | "
            f"{str(NOT(q)):5} | "
            f"{str(AND(p, q)):5} | "
            f"{str(OR(p, q)):5} | "
            f"{str(XOR(p, q)):7} | "
            f"{str(IMPLIES(p, q)):5} | "
            f"{str(IFF(p, q)):5}"
        )

print("=" * 75)