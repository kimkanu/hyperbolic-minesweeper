///
/// An algebraic _group_.
///
pub trait Group: Sized + PartialEq {
  /// Group binary operation.
  fn op(&self, other: &Self) -> Self;

  /// The unique group identity element.
  fn id() -> Self;

  /// Test for the identity value.
  fn is_id(&self) -> bool {
    *self == Self::id()
  }

  /// The unique inverse of a group element.
  fn inv(&self) -> Self;

  /// The cancellation of a group element.
  fn cancel(&self) -> Self {
    self.op(&self.inv())
  }
}
