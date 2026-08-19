# Bảng chân trị

Chương trình sử dụng các phép toán logic cơ bản để tạo **bảng chân trị** với hai giá trị `True` và `False`.

## Các phép toán sử dụng

| Ký hiệu | Hàm | Ý nghĩa |
|---|---|---|
| `!p` | `NOT(p)` | Phủ định của `p` |
| `!q` | `NOT(q)` | Phủ định của `q` |
| `p ^ q` | `AND(p, q)` | Phép hội |
| `p + q` | `OR(p, q)` | Phép tuyển |
| `p xor q` | `XOR(p, q)` | Phép XOR |
| `p -> q` | `IMPLIES(p, q)` | Phép kéo theo |
| `p <-> q` | `IFF(p, q)` | Phép tương đương |

## Code tạo bảng chân trị

```python
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
```

## Kết quả

```text
===========================================================================
 p  q | !p | !q | p^q | p+q | p xor q | p->q | p<->q
===========================================================================
True  True  | False | False | True  | True  | False   | True  | True
True  False | False | True  | False | True  | True    | False | False
False True  | True  | False | False | True  | True    | True  | False
False False | True  | True  | False | False | False   | True  | True
===========================================================================
```

## Bảng chân trị

| **p** | **q** | **!p** | **!q** | **p ^ q** | **p + q** | **p xor q** | **p -> q** | **p <-> q** |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| True | True | False | False | True | True | False | True | True |
| True | False | False | True | False | True | True | False | False |
| False | True | True | False | False | True | True | True | False |
| False | False | True | True | False | False | False | True | True |

## Giải thích nhanh

### `NOT`

Đảo giá trị logic:

```text
True  → False
False → True
```

### `AND`

`p AND q` chỉ **True khi cả p và q đều True**.

```text
True  AND True  → True
True  AND False → False
False AND True  → False
False AND False → False
```

### `OR`

`p OR q` **False khi cả p và q đều False**.

```text
True  OR True  → True
True  OR False → True
False OR True  → True
False OR False → False
```

### `XOR`

`p XOR q` **True khi p và q khác nhau**.

```text
True  XOR True  → False
True  XOR False → True
False XOR True  → True
False XOR False → False
```

### `IMPLIES`

`p -> q` chỉ **False khi p = True và q = False**.

```text
True  -> True  → True
True  -> False → False
False -> True  → True
False -> False → True
```

### `IFF`

`p <-> q` **True khi p và q có cùng giá trị**.

```text
True  <-> True  → True
True  <-> False → False
False <-> True  → False
False <-> False → True
```

> 💡 **Mẹo nhớ:** `IMPLIES` chỉ "toang" đúng **1 trường hợp**: `True -> False`. :))
>
> Còn `IFF` thì đơn giản: **giống nhau → True, khác nhau → False**.