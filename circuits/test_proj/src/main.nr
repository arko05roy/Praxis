use dep::std;

fn main(x: Field, y: Field) {
    let z = std::hash::sha256([x as u8]);
    assert(z != 0);
}

#[test]
fn test_main() {
    main(1, 2);

    // Uncomment to make test fail
    // main(1, 1);
}
