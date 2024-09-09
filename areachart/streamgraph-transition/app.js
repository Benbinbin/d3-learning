// 参考自 https://observablehq.com/@d3/streamgraph-transitions

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = container.clientHeight; // 高度

// 创建 svg
// 在容器 <div id="container"> 元素内创建一个 SVG 元素
// 返回一个选择集，只有 svg 一个元素
const svg = d3
  .select("#container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height]);

/**
 *
 * 一些与河流图相关的变量数据
 *
 */
// （堆叠的）系列的数量
const n = 20 // number of layers

// 每个系列的数据点的数量
const m = 200 // number of samples per layer

// 每个堆叠层的波动的数量
// 💡 将数据的波峰形象地称为 bump 「隆起」，这个术语强调的是数据曲线的起伏，反映出数据在某个时间段内的变化
// 这里设置 k=10 意味着每一个堆叠层会有 10 个这样的隆起，使得河流图更具起伏感和流动性，而非平滑无变化的线条
const k = 10 // number of bumps per layer

/**
 *
 * 构建比例尺
 *
 */
// 设置横坐标轴的比例尺
// 横坐标轴的数据是数据点的索引值（依次对应 200 个数据点），使用 d3.scaleLinear 构建一个线性比例尺
// 定义域范围 [0, m-1]（由数据点的数量 m=200 决定），值域范围是 svg 元素的宽度
const x = d3.scaleLinear([0, m - 1], [0, width]);

// 设置纵坐标轴的比例尺
// 纵坐标轴的数据是连续型的数值（随机生成的数据），使用 d3.scaleLinear 构建一个线性比例尺
// 定义域范围初始值先设置为 [0, 1] 后续根据数据集（从中提取最大值和最小值）进行修改，值域范围是 svg 元素的高度
const y = d3.scaleLinear([0, 1], [height, 0]);

/**
 *
 * 设置配色方案
 *
 */
// 使用 D3 内置的一种配色方案 d3.interpolateCool
// 通过方法 `d3.interpolateCool(t)` 从色谱中获取一种颜色，参数 t 取值范围是 [0, 1]
// 具体可以参考官方文档 https://d3js.org/d3-scale-chromatic/sequential#interpolateCool
// 采用的色谱是 Niccoli’s perceptual rainbow 具体参考 https://mycartablog.com/2013/02/21/perceptual-rainbow-palette-the-method/
// 为不同系列/堆叠层设置不同的颜色
const z = d3.interpolateCool;

/**
 *
 * 创建一个堆叠生成器，用于对数据进行转换
 *
 */
// 决定有哪些系列进行堆叠可视化
// 通过堆叠生成器对数据进行转换，便于后续绘制堆叠图
// 具体可以参考官方文档 https://d3js.org/d3-shape/stack
// 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#堆叠生成器-stacks
const stack = d3.stack()
  // 设置系列的名称（数组）
  // 使用 d3.range(n) 快速生成一个等差数列，并用数列各项作为元素构成一个数组返回
  // 这里生成一个具有 n 个元素的数组，第一个元素是 0，最后一个元素是 n-1
  // 该方法来自 d3-array 模块，具体可以参考官方文档 https://d3js.org/d3-array/ticks#range
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#刻度生成
  // D3 为每一个系列都设置了一个属性 key，其值是系列名称（生成面积图时，系列堆叠的顺序就按照系列名称的排序）
  .keys(d3.range(n))
  // 设置基线函数，通过更新堆叠图的上下界的值，可以调整图形整体的定位
  // D3 提供了一系列内置的基线函数，它们的具体效果可以参考 https://d3js.org/d3-shape/stack#stack-offsets
  // 默认使用内置基线函数 d3.stackOffsetNone 以零为基线
  // 这里使用另一种内置基线函数 d3.stackOffsetWiggle 通过移动基线，以最大程度地减小各系列的「振幅」（即各系列沿着横轴上下摆动的幅度），让河流图看起来更美观、流畅、易读
  // 可以阅读相关文章 https://leebyron.com/streamgraph/ 对这种算法的介绍
  .offset(d3.stackOffsetWiggle)
  // 设置排序函数，即决定堆叠图中各系列的叠放次序
  // 该函数返回的是一个数组（称为排序数组 order），里面的元素是一个表示索引的数值，依次对应于系列名称数组的元素，表示各系列的排序/叠放优先次序
  // D3 提供了一系列内置的排序函数，它们的具体效果可以参考 https://d3js.org/d3-shape/stack#stack-orders
  // 默认使用内置排序函数 d3.stackOrderNone 它不对排序/叠放次序进行改变
  // 即按照系列名称数组（通过方法 stack.keys() 所设置的）来排序
  .order(d3.stackOrderNone);

// 该函数用于生成随机数，可以让数据符合特定的分布特点
// 参考自 Lee Byron 的测试数据集生成器 https://leebyron.com/streamgraph/
function bump(a, n) {
  const x = 1 / (0.1 + Math.random());
  const y = 2 * Math.random() - 0.5;
  const z = 10 / (0.1 + Math.random());
  // 遍历数组 a 中的每个元素，对其值进行调整
  for (let i = 0; i < n; ++i) {
    const w = (i / n - y) * z;
    // 基于原始值 a[i] 再添加随机生成的数
    a[i] += x * Math.exp(-w * w);
  }
}

// 该函数生成用于绘制河流图（每个系列）的数据
function bumps(n, m) {
  const a = [];
  // 为数组 a 各个元素（共 n 个）设置初始值
  for (let i = 0; i < n; ++i) a[i] = 0; // 初始值均为 0

  // 迭代 m 次，为数组 a 各个元素设置值（随机数）
  // 让该数据集的波动的数量具有 m 个波峰
  for (let i = 0; i < m; ++i) bump(a, n);

  // 该函数最后返回值的是一个数组
  return a;
};

// 该函数用于生成数据集，同时设置纵坐标轴的定义域范围
function randomize() {
  // 使用堆叠生成器对数据集进行处理，最后返回一个数组，每一个元素都是一个系列（整个面积图就是由多个系列堆叠而成的）
  // 例如在本实例中，共有 20 个系列，所以返回的数组具有 20 个元素
  // 而每一个元素（系列）也是一个数组，其中每个元素是属于该系列的一个数据点，例如在本示例中，每个系列会有 200 个数据点
  // ⚠️ 由于堆叠生成器没有调用方法 stack.value() 设置自定义的（各系列的数据）读取函数，所以采用默认的读取函数
  // 默认的读取函数是 `function value(d, key) { return d[key]; }`
  // 在调用堆叠生成器对原始数据进行转换过程中，每一个原始数据 d 和系列名称 key（就是通过方法 stack.keys() 所设置的数组中的元素）会作为入参，分别调用该函数，以从原始数据中获取相应系列的数据
  // ⚠️ 由于这里采用默认的读取函数，所以构建的数据集的结构要与之相匹配，一般需要是一个对象数组，即每个元素都是对象，其中对象包含一系列属性，属性名是系列名，属性值是该数据点中相应系列的值
  // ⚠️ 在这里由于 key 采用索引值，所以最终只需要构建一个嵌套数组（而非对象数组）即可，子数组的索引值就相当于系列名
  // 这里先使用 JavaScript 数组的原生方法 Array.from(arrayLike, mapFn) 生成一个数组
  // 在这里参数 arrayLike 是一个对象，包含属性 length=20，所以生成一个包含 20 个元素的数组，每个元素初始值是 undefined
  // 然后再遍历每个元素并执行参数 mapFn 所设置的映射函数，以修改元素的值
  // 在这里参数 mapFn 是函数 () => bumps(m, k) 该函数返回返回值的是一个数组，包含 m=200 个元素，这些数据的分布特点是具有 k=10 个波峰（使得河流图更具起伏感和流动性，而非平滑无变化的线条）
  // 所以使用 Array.from() 创建的是一个嵌套数组，它有 20 个元素（表示 20 个系列），每个元素也是数组（表示每个系列包含 200 个数据点）
  // 最后再使用 d3.transpose(matrix) 对嵌套数组进行转换，也是得到一个嵌套数组，但是结构有所不同
  // 关于该方法的具体介绍可以参考官方文档 https://d3js.org/d3-array/transform#transpose
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#转换
  // 转换得到的嵌套数组变成了具有 200 个元素（表示 200 个原始数据点），每个元素也是数组（包含 20 个元素，分别对应于 20 个系列）
  // 这种数据结构就可以对应堆叠生成默认的读取函数
  const layers = stack(d3.transpose(Array.from({length: n}, () => bumps(m, k))));

  // 更改纵坐标轴的定义域
  // 以数据集中的最小值和最大值作为纵坐标轴的定义域范围
  y.domain([
    d3.min(layers, l => d3.min(l, d => d[0])), // 数据集中的最小值
    d3.max(layers, l => d3.max(l, d => d[1])) // 数据集中的最大值
  ]);

  return layers;
}

/**
 *
 * 绘制面积图内的面积形状
 *
 */
// 使用 d3.area() 创建一个面积生成器
// 面积生成器会基于给定的数据生成面积形状
// 调用面积生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
// 具体可以参考官方文档 https://d3js.org/d3-shape/area
// 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#面积生成器-areas
const area = d3.area()
// 设置下边界线横坐标读取函数
// 💡 不需要再设置上边界线横坐标读取函数，因为默认会复用相应的下边界线横坐标值，这符合横向延伸的面积图
// 该函数会在调用面积生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
// 这里基于每个数据点（在数组中相应）的索引值并采用比例尺 x 进行映射，计算出相应的横坐标
.x((d, i) => x(i))
// 设置下边界线的纵坐标的读取函数
// 这里基于每个数据点（二元数组）的第一个元素 d[0] 并采用比例尺 y 进行映射，计算出相应的纵坐标
.y0(d => y(d[0]))
// 设置上边界线的纵坐标的读取函数
// 这里基于每个数据点（二元数组）的第二个元素 d[1] 并采用比例尺 y 进行映射，计算出相应的纵坐标
.y1(d => y(d[1]));

// 将每个系列的面积形状绘制到页面上
const path = svg.selectAll("path") // 返回一个选择集，其中虚拟/占位元素是一系列的 <path> 路径元素，用于绘制各系列的形状
  .data(randomize) // 绑定数据，每个路径元素 <path> 对应一个系列数据
  .join("path") // 将元素绘制到页面上
    // 由于面积生成器并没有调用方法 area.context(parentDOM) 设置画布上下文
    // 所以调用面积生成器 area 返回的结果是字符串
    // 该值作为 `<path>` 元素的属性 `d` 的值
    .attr("d", area)
    // 设置填充颜色，为每个系列随机挑选一个颜色
    // 使用 Math.random() 生成一个在 [0, 1) 范围里的随机数，然后通过方法 z() 从配色方案中得到相应的颜色值
    .attr("fill", () => z(Math.random()));

// 执行无限循环，不断更新河流图的数据
(async function () {
  while (true) {
  // yield svg.node();
  // 异步操作，在当前过渡完成时（Promise 才会 resolve），才会进入下一个循环周期（开始新一轮的过渡动画 ）
  await path
    .data(randomize) // 绑定新生成的数据集
    // 设置过渡动效（通过更改 `<path>` 的属性 d 实现）
    // 通过 selection.transition() 创建过渡管理器
    // 过渡管理器和选择集类似，有相似的方法，例如为选中的 DOM 元素设置样式属性
    // 具体参考官方文档 https://d3js.org/d3-transition
    // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-transition
    .transition()
      .delay(1000) // 设置过渡的延迟/等待时间
      .duration(1500) // 设置过渡的时间
      // 重绘各堆叠的面积形状
      .attr("d", area)
    // 最后通过方法 transition.end() 返回一个 Promise，仅在过渡管理器所绑定的选择集合的所有过渡完成时才 resolve
    // 这样就可以在当前的过渡结束时，才做执行后面操作（重复下一轮动画）
    .end();
}
})();