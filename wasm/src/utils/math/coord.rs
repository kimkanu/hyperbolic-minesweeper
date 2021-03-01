use num_complex::Complex;
use num_traits::{Float, Num, Zero};

#[derive(PartialEq, Eq, Copy, Clone, Hash, Debug, Default)]
pub struct Normal<T = f64>(pub Complex<T>);

#[derive(PartialEq, Eq, Copy, Clone, Hash, Debug, Default)]
pub struct Poincare<T = f64> {
    pub norm: T,
    pub arg: T,
}

impl<T: Float + HaveConstants> Poincare<T> {
    pub fn new(norm: T, arg: T) -> Self {
        Poincare {
            norm,
            arg: arg.principal_arg(),
        }
    }
}

#[derive(PartialEq, Eq, Copy, Clone, Hash, Debug)]
pub enum Coord<T> {
    Normal(Normal<T>),
    Poincare(Poincare<T>),
}

/// Define `zero` without add operation
pub trait LiteralZero: Sized {
    /// Returns `0`.
    fn zero() -> Self;

    /// Sets `self` to the additive identity element of `Self`, `0`.
    fn set_zero(&mut self) {
        *self = Self::zero();
    }

    /// Returns `true` if `self` is equal to the additive identity.
    fn is_zero(&self) -> bool;
}

impl<T: Clone + Num> LiteralZero for Normal<T> {
    fn zero() -> Self {
        Normal(Complex::zero())
    }

    fn is_zero(&self) -> bool {
        self.0.is_zero()
    }
}

impl<T: Clone + Num> LiteralZero for Poincare<T> {
    fn zero() -> Self {
        Poincare {
            norm: T::zero(),
            arg: T::zero(),
        }
    }

    fn is_zero(&self) -> bool {
        self.norm.is_zero() && self.arg.is_zero()
    }
}

pub trait HaveConstants: Float {
    const ZERO: Self;
    const ONE: Self;
    const TWO: Self;
    const FOUR: Self;
    const EIGHT: Self;
    const SIXTEEN: Self;
    const PI: Self;
    const TWO_PI: Self;
    const FRAC_PI_2: Self;
    const FRAC_PI_3: Self;
    const FRAC_PI_4: Self;
    const FRAC_PI_6: Self;
    const FRAC_PI_8: Self;

    /// shift arg into (-π, π]
    fn principal_arg(&self) -> Self {
        let arg = self.clone();
        if arg <= Self::PI && arg > Self::PI.neg() {
            arg
        } else {
            let one_half = Self::one() / (Self::one() + Self::one());
            arg + (one_half - arg / Self::TWO_PI).floor() * Self::TWO_PI
        }
    }
}

impl HaveConstants for f32 {
    const ZERO: f32 = 0f32;
    const ONE: f32 = 1f32;
    const TWO: f32 = 2f32;
    const FOUR: f32 = 4f32;
    const EIGHT: f32 = 8f32;
    const SIXTEEN: f32 = 16f32;
    const PI: f32 = std::f32::consts::PI;
    const TWO_PI: f32 = 2f32 * std::f32::consts::PI;
    const FRAC_PI_2: f32 = std::f32::consts::FRAC_PI_2;
    const FRAC_PI_3: f32 = std::f32::consts::FRAC_PI_3;
    const FRAC_PI_4: f32 = std::f32::consts::FRAC_PI_4;
    const FRAC_PI_6: f32 = std::f32::consts::FRAC_PI_6;
    const FRAC_PI_8: f32 = std::f32::consts::FRAC_PI_8;
}

impl HaveConstants for f64 {
    const ZERO: f64 = 0f64;
    const ONE: f64 = 1f64;
    const TWO: f64 = 2f64;
    const FOUR: f64 = 4f64;
    const EIGHT: f64 = 8f64;
    const SIXTEEN: f64 = 16f64;
    const PI: f64 = std::f64::consts::PI;
    const TWO_PI: f64 = 2f64 * std::f64::consts::PI;
    const FRAC_PI_2: f64 = std::f64::consts::FRAC_PI_2;
    const FRAC_PI_3: f64 = std::f64::consts::FRAC_PI_3;
    const FRAC_PI_4: f64 = std::f64::consts::FRAC_PI_4;
    const FRAC_PI_6: f64 = std::f64::consts::FRAC_PI_6;
    const FRAC_PI_8: f64 = std::f64::consts::FRAC_PI_8;
}

/// Define `norm`, `arg`, `conj`, and `rotate`
pub trait CoordOps: Sized {
    type Norm;
    type Angle;
    const PI: Self::Angle;

    /// Returns the norm of a coordinate, i.e., the distance from the origin.
    ///
    /// Be careful that the norm of `Normal` and `Poincare` are NOT compatible.
    fn norm(&self) -> Self::Norm;

    /// Returns the arg of a coordinate.
    fn arg(&self) -> Self::Angle;

    /// Returns the conjugation of a coordinate. (without mutating itself)
    fn conj(&self) -> Self;

    /// Returns e^(iθ) * self. (without mutating itself)
    fn rotate(&self, theta: Self::Angle) -> Self;

    /// Returns -self. (without mutating itself)
    fn neg(&self) -> Self {
        self.rotate(Self::PI)
    }
}

impl<T: Float + HaveConstants> CoordOps for Normal<T> {
    type Norm = T;
    type Angle = T;
    const PI: T = T::PI;

    fn norm(&self) -> Self::Norm {
        self.0.norm()
    }

    fn arg(&self) -> Self::Angle {
        self.0.arg()
    }

    fn conj(&self) -> Self {
        Self(self.0.conj())
    }

    fn rotate(&self, theta: Self::Angle) -> Self {
        Self(self.0 * Complex::from_polar(T::one(), theta))
    }
}

impl<T: Float + HaveConstants> CoordOps for Poincare<T> {
    type Norm = T;
    type Angle = T;
    const PI: T = T::PI;

    fn norm(&self) -> Self::Norm {
        self.norm
    }

    fn arg(&self) -> Self::Angle {
        self.arg
    }

    fn conj(&self) -> Self {
        Self::new(self.norm, self.arg.neg())
    }

    fn rotate(&self, theta: Self::Angle) -> Self {
        Self::new(self.norm, self.arg + theta)
    }
}

impl<T: Float + HaveConstants> CoordOps for Coord<T> {
    type Norm = T;
    type Angle = T;
    const PI: T = T::PI;

    fn norm(&self) -> Self::Norm {
        match self {
            Self::Normal(inner) => inner.norm(),
            Self::Poincare(inner) => inner.norm(),
        }
    }

    fn arg(&self) -> Self::Angle {
        match self {
            Self::Normal(inner) => inner.arg(),
            Self::Poincare(inner) => inner.arg(),
        }
    }

    fn conj(&self) -> Self {
        match self {
            Self::Normal(inner) => Self::Normal(inner.conj()),
            Self::Poincare(inner) => Self::Poincare(inner.conj()),
        }
    }

    fn rotate(&self, theta: Self::Angle) -> Self {
        match self {
            Self::Normal(inner) => Self::Normal(inner.rotate(theta)),
            Self::Poincare(inner) => Self::Poincare(inner.rotate(theta)),
        }
    }
}
