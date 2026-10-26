# AHP criteria weights

This auxiliary criteria-weighting model uses the classical principal right eigenvector method. For a positive reciprocal matrix `A`, priorities `w` satisfy `A w = lambda_max w`; the normalized principal eigenvector sums to one. This is the eigenvalue formulation described in Ishizaka, Pearman and Nemery (2012), section 3, equation (2), and in Saaty's original AHP work.

For `n >= 3`, consistency is reported as `CI = (lambda_max - n)/(n - 1)` and `CR = CI/RI`, using Saaty's canonical Random Index values for orders 1 through 15. At `n=1` and `n=2`, the conventional CI/CR ratio is not applicable and the model returns `null`, rather than inventing a value. A CR above `0.10` is a review signal; it does not block weights.

The service accepts the 1–9 Saaty judgments and their reciprocals. Each evaluation stores exactly one orientation for every unordered pair; the opposite matrix cell is constructed as its reciprocal and the diagonal is fixed at 1. A complete matrix has `n(n-1)/2` independent comparisons. More than 15 criteria is rejected because the configured canonical RI table ends at order 15.

## Group handling

Each expert matrix is solved independently. For multiple experts, the existing MCC criteria-weight service combines the resulting normalized priority vectors. The model does not geometrically average or otherwise average pairwise matrices. It retains each expert's priority vector, eigenvalue, CI, CR, consistency status and completed comparison count; the originally submitted matrices remain in the persisted criteria-weighting evaluations.

## Ishizaka et al. (2012) reconstruction check

Figure 4's five supplier-criterion responses determine the following upper-triangle judgments in criterion order Experience, Flexibility, Security, Resilience, Environment:

```text
             E    F    S    R    Env
E            1    7    4    7     8
F           1/7   1   1/4   1     3
S           1/4   4    1    4     5
R           1/7   1   1/4   1     3
Env         1/8  1/3  1/5  1/3    1
```

The judgments are read from Figure 4's directional response marks and uniquely determine its reciprocal matrix. The computed principal-eigenvector priorities are approximately `0.564526, 0.080645, 0.233734, 0.080645, 0.040450`, and `CR = 0.051191`. These round to Table 4's published weights `0.565, 0.081, 0.234, 0.081, 0.040` and reported inconsistency ratio `0.05`.
