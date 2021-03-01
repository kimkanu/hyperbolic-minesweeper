# Hyperbolic Minesweeper Wasm Docs

This directory contains files compiling a wasm file for the web app. This docs is for describing the APIs and algorithms used to implement features.

## Coordinate Systems

Any point will be represented as a complex number, with a help of `num-complex` crate. The basic coordinate systems we impose are the following:

* Normal Cartesian/polar coordinate
* Poincare disk model: a pair of the distance (w.r.t. the metric of Poincare disk model) from the center of the disk and the angle. This is called the *azimuthal equidistant projection*.


## Poincare Disk Model

### Automorphism Group

The automorphism group of Poincare disk model $C_\infty$ is isomorphic to $\mathrm{PSL}(2;\mathbb R)$, and has the following concrete construction:

$$f = \dagger^{n} \circ R_\theta \circ T_v \in \mathrm{Aut}(C_\infty)$$ 

where $v$ is the representation in polar coordinate of a point in Poincare disk, $n\in\{0,1\}$, $T_v(z) = \frac{z + v}{\bar v z + 1}$, $R_\theta(z) = e^{i\theta}z$, and $\dagger(z) = \bar{z}$. This automorphism group is modeled by `struct PoincareAut<T>` in `src/utils/math/poincare_aut.rs`.


#### Composition

To compose two automorphisms, we observe following rules:

$$T_w \circ \dagger(z) = \frac{\bar{z} + w}{\overline{wz} + 1} = \overline{\left(\frac{z + \bar{w}}{wz + 1}\right)} = \dagger\circ T_{\bar{w}}(z),$$ 

$$R_\theta \circ \dagger(z) = e^{i\theta}\bar{z} = \overline{e^{-i\theta}z} = \dagger\circ R_{-\theta} (z),$$ 

$$T_w \circ R_\theta (z) = \frac{ e^{i\theta}z + w }{ \bar w e^{i\theta} z + 1 } = e^{i\theta} \frac{z + e^{-i\theta}w}{\overline{e^{-i\theta}w}z + 1} = R_\theta \circ T_{e^{-i\theta} w} (z),$$ 

and

$$T_w \circ T_v(z) = \frac{\frac{z + v}{\bar{v}z + 1} + w}{\bar{w} \frac{z + v}{\bar{v}z + 1} + 1} = \frac{(1 + \bar v w)z + (v + w)}{\overline{(v + w)}z + (1 + v \bar{w})} = R_\psi\circ T_u (z)$$ 

where $\psi = \operatorname{arg} \frac{1 + \bar v w}{1 + v \bar w} = 2\operatorname{arg} (1 + \bar v w)$ and $u = \frac{v + w}{1 + \bar v w} = T_v(w)$.

In summary, we have

$$(\dagger^n \circ R_\varphi \circ T_w) \circ (\dagger^m \circ R_\theta \circ T_v) = \dagger^{n+m} \circ R_{\theta + (-1)^m \varphi + \psi} \circ T_u$$

where $\psi = 2 \operatorname{arg}(1 + \bar v e^{-i\theta} \dagger^m (w)))$ and $u = T_v(e^{-i\theta} \dagger^m(w))$.


#### Considering the Nature of Floating Numbers

However, this is not the end; we need to convert $T_v$s from/into Poincare disk model. What makes worse is that we cannot use conversion of polar coordinate into Poincare disk model due to its accuracy. For instance, since `f32` has 24-bit significand, the norm of a point inside the unit disk in polar coordinate is at most $1 - 2^{-24}$, under the most ideal situation. And this radius corresponds to $\log(2^{25} - 1) \approx 17.32868$ in Poincare disk model. `f64` is not that different: $\log(2^{54} - 1) \approx 37.42995$. Thus, if we change coordinate systems carelessly, it might result in a significant error outside of a small region (centered at the origin). This is the reason that `trsl` is typed as `Poincare<T>`, not `Normal<T>`.


#### Calculation of $\boldsymbol{1 + \bar v w}$

What we need to calculate are the values of $\psi$ and $u$ described above. Before that, let us first calculate $1 + \bar v w$ and $T_v(w)$ for arbitrary points $v$ and $w$ inside Poincare disk.

With the calculation of $1 + \bar{v} w$, the only bad situation is that $1 + \bar{v} w \approx 0$, that is, $|v|,|w|\approx 1$ and $\operatorname{arg}(w) - \operatorname{arg}(v) \approx \pi \pmod{2\pi}$. Otherwise, the value will be quite reliable.

Let $v = |v| e^{i\varpi}$, $w = |w| e^{i\varphi}$, $r_v^* := 1 - |v|$, and $r_w^* \coloneqq 1 - |w|$. Suppose $r_v^*, r_w^* < \varepsilon_r$ for some constant $\varepsilon_r > 0$ w.r.t. the datatype. (Otherwise, direct calculation might be better since it uses less operations so that it has less round-off errors.) Then, we have

$$1 + \bar{v} w = 1 + (1 - r_v^*)(1 - r_w^*) e^{i(\varphi - \varpi)} = (r_v^* + r_w^* - r_v^* r_w^*) - |v||w|(e^{i\eta} - 1)$$ 

where $\eta = \varphi - \varpi + \pi = \operatorname{arg}(w) - \operatorname{arg}(v) + \pi \pmod{2\pi}$ with $|\eta| \ll 1$.

Then $e^{i\eta} - 1$ can be calculated for small $\eta$ easily with Taylor series expansion without losing precision. Also, the first term is real and the second term is almost pure imaginary, there will not be much interference between two terms. So, this would be the most ideal calculation under our 'finite universe' situation.


#### Calculation of $\boldsymbol{T_v(w)}$

Let us focus on $u = T_v(w) = \frac{v + w}{1 + \bar{v} w}$ for $v=|v|e^{i\varpi}$ and $w=|w|e^{i\varphi}$. $v + w$ has small norm when $\operatorname{arg}(v) - \operatorname{arg}(w) \approx \pi$ and $|v| \approx |w|$. (Or $|v|$ and $|w|$ are small, but there is nothing interesting in this case since resulting $u$ is near $0\in C_\infty$ so that the conversion into Poincare disk model does not go weird.) Another critical error that could be arisen here is when $|u|$ is near 1, as before.

Observe that

$$1 - |u| = \frac{|1 + \bar{v} w| - |v + w|}{|1 + \bar{v} w|} = \frac{(1 - |v|)(1 - |w|)(1 + |v|)(1 + |w|)}{|1 + \bar{v} w|(|1 + \bar{v} w| + |v + w|)}$$ 

and

$$v + w = |v| e^{i\varpi} + |w| e^{i\varphi} = e^{i\varpi} ((r_w^* - r_v^*) - |w|(e^{i\eta} - 1))$$ 

where $\eta = \varphi - \varpi + \pi = \operatorname{arg}(w) - \operatorname{arg}(v) + \pi \pmod{2\pi}$ with $|\eta| \ll 1$. Then, 

$$\operatorname{arg}(u) = \operatorname{arg}(v + w) - \operatorname{arg}(1 + \bar{v} w)$$ 

can be obtained.

Now, we need to obtain $\delta_u$. Let $v$ and $w$ have $\delta_v$ and $\delta_w$ as their Poincare disk norm, resp., i.e.,

$$r_v^* = 1 - |v| = \frac{2}{e^{\delta_v} + 1}, \quad r_w^* = 1 - |w| = \frac{2}{e^{\delta_w} + 1}.$$

Then, we have $$r_u^* = 1 - |u| = \frac{4e^{\delta_v}}{(e^{\delta_v} + 1)^2}\cdot\frac{4e^{\delta_w}}{(e^{\delta_w} + 1)^2}\cdot \frac{1}{|1 + \bar{v} {w}|(|1 + \bar{v} {w}| + |v + {w}|)}$$

where $1 + \bar{v} w$ and $v + w$ are calculated as follows:

$$1 + \bar{v} w = \begin{cases}
\frac{2(e^{\delta_v} + e^{\delta_w})}{(e^{\delta_v} + 1)(e^{\delta_w} + 1)} - \frac{(e^{\delta_v} - 1)(e^{\delta_w} - 1)}{(e^{\delta_v} + 1)(e^{\delta_w} + 1)}(e^{i\eta} - 1), & r_v^* ,r_w^* < \varepsilon_r\text{ and }|\eta| < \varepsilon_{\eta}  \\
\text{direct calculation}, &\text{otherwise}
\end{cases} $$

and

$$ v + w = \begin{cases}
e^{i\varpi} \left(\frac{2(e^{\delta_v} + e^{\delta_w})}{(e^{\delta_v} + 1)(e^{\delta_w} + 1)} - \frac{e^{\delta_w} - 1}{e^{\delta_w} + 1}(e^{i\eta} - 1)\right), & \bigl| |v| - |w| \bigr| < \varepsilon_r\text{ and }|\eta| < \varepsilon_{\eta}  \\
\text{direct calculation}, &\text{otherwise}
\end{cases} $$

where $\eta = \varphi - \varpi + \pi = \operatorname{arg}(w) - \operatorname{arg}(v) + \pi \pmod{2\pi}$ with $|\eta| \ll 1$.

For an accurate calculation of $\delta_u = \log\left( \frac{2}{r_u^*} - 1 \right)$ for (exponentially) small $r_u^*$, consider the Laurent series expansion of $\log x - \log(x-1)$ at $x=\infty$:

$$ \log x - \log(x\mp 1) = \sum_{k=1}^\infty \frac{(\pm 1)^k}{kx^k}. $$

Thus, for $r_u^* < \varepsilon_r$ small enough,

$$ \begin{aligned}
\delta_u = \log\left( \frac{2}{r_u^*} - 1 \right) &= \log \frac{2}{r_u^*} - \sum_{k=1}^\infty \frac{(r_u^*)^k}{k 2^k}
\\&= 2 \log(e^{\delta_v} + 1) + 2\log(e^{\delta_w} + 1) - \log 8 - (\delta_v + \delta_w)
\\&\quad - \log |1+\bar v w| - \log(|1+\bar v w| + |v + w|) - \sum_{k=1}^\infty \frac{(r_u^*)^k}{k 2^k}
\\&= (\delta_v + \delta_w) - \log 8 + 2 \log(1 + e^{-\delta_v}) + 2\log(1 + e^{-\delta_w})
\\&\quad - \log |1+\bar v w| - \log(|1+\bar v w| + |v + w|) - \sum_{k=1}^\infty \frac{(r_u^*)^k}{k 2^k}.
\end{aligned} $$

Otherwise, just $\delta_u = \log\left(\frac{2}{r_u^*} - 1\right)$ would be enough.


#### Calculation of $\boldsymbol{T_{e^{-i\theta} \dagger^m(w)} \circ T_v = R_\psi \circ T_u}$

Now we can calculate the values of $\psi$, $\delta_u$ and $\operatorname{arg}(u)$ where $T_{e^{-i\theta} \dagger^m(w)} \circ T_v = R_\psi \circ T_u$, using

$$ \psi = 2 \operatorname{arg}(1 + \bar v \cdot e^{-i\theta} \dagger^m (w)) $$

and

$$ u = T_v(e^{-i\theta} \dagger^m(w)) $$

using calculation methods described above, for appropriate epsilon values $\varepsilon_r$ and $\varepsilon_\eta$.

